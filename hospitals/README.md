# WayWey hospital datasets

WayWey uses one shared application engine (`index.html`, `app.js`, `styles.css`) and a separate data package for each hospital.

Each hospital folder contains:

- `config.json` — hospital name, default language, starting points and hospital-specific labels.
- `destinations.json` — searchable services, aliases, locations and verification status.
- `routes.json` — building graph, pavilion labels, special connectors and note translations.
- `guide.json` — bilingual in-app ambassador quick guide.

The hospital is selected with the `hospital` URL parameter. Example:

`?hospital=jgh`

Future hospitals, such as CHUM, can use the same engine by adding another folder under `hospitals/` with the same four files.
