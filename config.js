import 'dotenv/config';
import { unwatchFile, watchFile } from 'fs';
import { fileURLToPath } from 'url';

global.owner = ['6282328190003'];
global.selfmode = false;
global.wm = 'Powered By Izu-Ai';
global.nameBot = 'Izu-Ai';
global.apikey = process.env.APIKEY || '';
global.thumbnailUrl = 'https://telegra.ph/file/ecea75426746c3debcde2.jpg';

global.pairing_code = {
  status: true,
  number: '',
};

global.mess = {
  wait = `Tunggu sebentar...`
  admin = `Fitur ini hanya bisa digunakan oleh Admin group`
  group = `Fitur ini hanya bisa digunakan di group chat`
  pribadi = `Fitur ini hanya bisa digunakan di private chat`
  owner = `Maaf hanya orang tertentu yang bisa menggunakan fitur ini`
  premium = `Fitur ini hanya bisa digunakan oleh User premium`
}

let fileP = fileURLToPath(import.meta.url);
watchFile(fileP, () => {
  unwatchFile(fileP);
  console.info(`${fileP} file changed, restarting...`);
});
