// Local-only JGH field collection. Success means the IndexedDB transaction
// committed, not merely that its individual write request succeeded.
const $ = id => document.getElementById(id);
const defaults = [
  'Main Entrance', 'Ambassador / Information Desk', 'Emergency', 'Medical Imaging',
  'MRI', 'X-Ray', 'Ultrasound', 'CT Scan', 'Test Centre / Blood Tests', 'Urology',
  'Segal Cancer Centre / Oncology', 'Gastroenterology', 'Herzl Family Practice',
  'Main Elevator Banks', 'Central Corridor / Pavilion B', 'Admissions',
  'Outpatient Clinics', 'Pharmacy', 'Cardiology', 'Surgical Clinics', 'Endoscopy',
  'Maternity / Postpartum', 'Pediatrics', 'Vascular Lab', 'Cafeteria',
  'Volunteer Services', 'Parking / Main Exit', 'Washrooms',
  ...['A', 'B', 'C', 'D', 'E', 'G', 'H', 'K'].map(p => 'Pavilion ' + p + ' Sign'),
  'H–K Connector', 'Elevator Directories', 'Floor Directories', 'Hallway Intersections'
];
const metadataFields = ['floor', 'pavilion', 'room', 'notes'];
let names = defaults.slice(), records = [], current = names[0];
let pending = null, pendingUrl = null, replacing = null, source = 'camera';
let db = null, busy = false;
const thumbnailUrls = new Set();

function say(message) { $('status').textContent = message; }
function uid() { return crypto.randomUUID?.() || Date.now() + '-' + Math.random(); }
function refreshControls() {
  const unavailable = !db || busy;
  for (const id of ['camera', 'upload', 'newDest', 'next', 'query', 'type', ...metadataFields]) {
    $(id).disabled = unavailable;
  }
  for (const button of document.querySelectorAll('#places button, #gallery button')) button.disabled = unavailable;
  $('accept').disabled = unavailable || !pending;
  $('retry').disabled = unavailable || !pending;
  $('export').disabled = unavailable;
}
function dbOpen() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('waywey-jgh-capture', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('photos', {keyPath: 'id'});
      request.result.createObjectStore('settings', {keyPath: 'id'});
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => say('Close other photo-capture tabs, then reload to open photo storage.');
  });
}
function read(store, key) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store);
    const objectStore = transaction.objectStore(store);
    const request = key === undefined ? objectStore.getAll() : objectStore.get(key);
    transaction.oncomplete = () => resolve(request.result);
    transaction.onabort = () => reject(transaction.error || Error('Storage read was aborted.'));
    transaction.onerror = () => reject(transaction.error || request.error);
  });
}
function put(store, value) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, 'readwrite');
    const request = transaction.objectStore(store).put(value);
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error || Error('Save was aborted. Please try again.'));
    transaction.onerror = () => reject(transaction.error || request.error);
  });
}
function clearPending() {
  pending = null;
  replacing = null;
  if (pendingUrl) URL.revokeObjectURL(pendingUrl);
  pendingUrl = null;
  $('preview').removeAttribute('src');
  $('preview').hidden = true;
  $('emptyPreview').hidden = false;
  refreshControls();
}
function pick(name) {
  if (busy) return;
  current = name;
  $('current').textContent = name;
  clearPending();
  for (const id of metadataFields) $(id).value = '';
  $('type').value = 'destination_sign';
  render();
}
function render() {
  const search = $('query').value.toLowerCase();
  $('places').replaceChildren();
  for (const name of names.filter(n => n.toLowerCase().includes(search))) {
    const count = records.filter(r => r.destination === name).length;
    const button = document.createElement('button');
    button.className = 'dest' + (current === name ? ' on' : '');
    button.textContent = name + ' — ' + (count ? count + ' saved' : 'Needed');
    button.onclick = () => pick(name);
    $('places').append(button);
  }
  $('counter').textContent = records.length + ' accepted photos · ' +
    names.filter(n => records.some(r => r.destination === n)).length + '/' + names.length + ' destinations';
  for (const url of thumbnailUrls) URL.revokeObjectURL(url);
  thumbnailUrls.clear();
  $('gallery').replaceChildren();
  const photos = records.filter(r => r.destination === current);
  $('none').hidden = photos.length > 0;
  for (const record of photos) {
    const card = document.createElement('div'), image = document.createElement('img');
    const label = document.createElement('div'), button = document.createElement('button');
    const url = URL.createObjectURL(record.blob);
    thumbnailUrls.add(url);
    card.className = 'thumb';
    image.src = url;
    image.alt = record.destination + ' — ' + record.type.replaceAll('_', ' ');
    image.onload = image.onerror = () => {URL.revokeObjectURL(url); thumbnailUrls.delete(url);};
    label.textContent = record.type.replaceAll('_', ' ') + ' ' + (record.room || record.floor || '');
    button.textContent = 'Replace';
    button.onclick = () => {
      if (busy) return;
      // Never allow a previously selected, unrelated file to overwrite this photo.
      clearPending();
      replacing = record.id;
      $('type').value = record.type;
      for (const id of metadataFields) $(id).value = record[id] || '';
      say('Select Camera or Gallery, then Accept to replace this photo.');
      $('camera').scrollIntoView({behavior: 'smooth', block: 'center'});
    };
    card.append(image, label, button);
    $('gallery').append(card);
  }
  refreshControls();
}
function capture(kind) {
  if (!db || busy) return;
  source = kind;
  const input = $(kind === 'camera' ? 'cameraInput' : 'uploadInput');
  input.value = '';
  input.click();
}
function chosen(event) {
  if (!db || busy) return;
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) return say('Select an image.');
  if (pendingUrl) URL.revokeObjectURL(pendingUrl);
  pending = file;
  pendingUrl = URL.createObjectURL(file);
  $('preview').src = pendingUrl;
  $('preview').hidden = false;
  $('emptyPreview').hidden = true;
  refreshControls();
  say('Review the photo, then tap Accept.');
}
async function accept() {
  if (!db || !pending || busy) return;
  busy = true;
  refreshControls();
  const previous = records.find(r => r.id === replacing);
  const record = {
    id: replacing || uid(), destination: current, type: $('type').value,
    ...Object.fromEntries(metadataFields.map(id => [id, $(id).value])),
    created: previous?.created || new Date().toISOString(), blob: pending
  };
  if (previous) record.updated = new Date().toISOString();
  try {
    await put('photos', record);
    records = records.filter(r => r.id !== record.id).concat(record);
    clearPending();
    render();
    say('Photo saved on this phone.');
  } catch (error) {
    say('Save failed: ' + error.message);
  } finally {
    busy = false;
    refreshControls();
  }
}
function asDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
async function exportAll() {
  if (!db || busy) return;
  if (!records.length) return alert('Accept a photo first.');
  busy = true;
  refreshControls();
  $('export').textContent = 'Preparing backup…';
  try {
    const photos = [];
    for (const {blob, ...metadata} of records) photos.push({...metadata, image: await asDataUrl(blob)});
    const file = new Blob([JSON.stringify({hospital: 'JGH', exportedAt: new Date().toISOString(), destinations: names, photos})], {type: 'application/json'});
    const url = URL.createObjectURL(file), link = document.createElement('a');
    link.href = url;
    link.download = 'waywey-jgh-photos-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    say('Backup download started. Store it safely.');
  } catch (error) {
    say('Backup error: ' + error.message);
  } finally {
    busy = false;
    $('export').textContent = 'Export all photos';
    refreshControls();
  }
}
async function addDestination() {
  if (!db || busy) return;
  const name = prompt('Enter destination name:')?.trim();
  if (!name) return;
  const updated = names.includes(name) ? names : [...names, name];
  busy = true;
  refreshControls();
  try {
    await put('settings', {id: 'destinations', names: updated});
    names = updated;
    busy = false;
    $('query').value = '';
    pick(name);
  } catch (error) {
    say('Destination could not be saved: ' + error.message);
  } finally {
    busy = false;
    refreshControls();
  }
}
$('camera').onclick = () => capture('camera');
$('upload').onclick = () => capture('upload');
$('cameraInput').onchange = chosen;
$('uploadInput').onchange = chosen;
$('accept').onclick = accept;
$('retry').onclick = () => capture(source);
$('query').oninput = render;
$('export').onclick = exportAll;
$('newDest').onclick = addDestination;
$('next').onclick = () => {
  if (!db || busy) return;
  const name = names.find(n => !records.some(r => r.destination === n));
  if (name) {$('query').value = ''; pick(name);}
  else alert('All destinations have photos.');
};
refreshControls();
try {
  db = await dbOpen();
  names = (await read('settings', 'destinations'))?.names || names;
  records = await read('photos');
  current = names[0];
  $('current').textContent = current;
  render();
  say('Local storage ready. Export a backup regularly.');
} catch (error) {
  db?.close();
  db = null;
  say('Cannot save on this browser: ' + error.message);
  render();
}
