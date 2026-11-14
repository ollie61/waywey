import contextlib
import importlib.util
import io
import json
from pathlib import Path
import shutil
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('validator', ROOT / 'scripts/validate_hospitals.py')
validator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(validator)


class ValidatorTests(unittest.TestCase):
    def run_package(self, mutate):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            package = root / 'hospitals/jgh'
            shutil.copytree(ROOT / 'hospitals/jgh', package)
            mutate(package)
            output = io.StringIO()
            with patch.multiple(validator, ROOT=root, HOSPITALS=root / 'hospitals'), contextlib.redirect_stdout(output), contextlib.redirect_stderr(output):
                code = validator.main()
            return code, output.getvalue()

    @staticmethod
    def edit(package, filename, mutate):
        file = package / filename
        data = json.loads(file.read_text(encoding='utf-8'))
        mutate(data)
        file.write_text(json.dumps(data), encoding='utf-8')

    def test_schema_failure_reports_errors_without_cross_file_crash(self):
        code, output = self.run_package(lambda p: self.edit(p, 'config.json', lambda d: d.pop('entrances')))
        self.assertEqual(code, 1)
        self.assertIn("'entrances' is a required property", output)

    def test_persian_station_directions_are_supported(self):
        def mutate(data):
            for route in data['stationDestinationDirections'].values():
                route['fa'] = ['راهنمای مسیر']
        code, output = self.run_package(lambda p: self.edit(p, 'routes.json', mutate))
        self.assertEqual(code, 0, output)

    def test_unknown_alias_is_rejected(self):
        code, output = self.run_package(lambda p: self.edit(p, 'config.json', lambda d: d['nodeAliases'].update({'BAD': 'missing-node'})))
        self.assertEqual(code, 1)
        self.assertIn('unknown routing node', output)

    def test_duplicate_entrance_ids_are_rejected(self):
        code, output = self.run_package(lambda p: self.edit(p, 'config.json', lambda d: d['entrances'].append(d['entrances'][0])))
        self.assertEqual(code, 1)
        self.assertIn('duplicate entrance ids', output)


if __name__ == '__main__':
    unittest.main()
