import './config.js';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import util from 'util';
import chalk from 'chalk';
import menu from './lib/menu.js';
import { exec } from 'child_process';
import { axios } from 'axios'
import { moment } from 'moment-timezone'
import { readFileSync, unlink, unwatchFile, watchFile } from 'fs';
import {
  byteToSize,
  fetchbuffer,
  getMime,
  getSize,
  UcapanFunc,
  Styles,
} from './lib/functions.js';
import { SearchSpotify, DownloadSpotify } from './lib/spotify.js';

export default async function message(IzuCnn, store, m, chatUpdate) {
  try {
    let isOwners = ['6289513081052', ...owner].includes(m.sender.split('@')[0]);
    let quoted = m.quoted ? m.quoted : m;
    let Downloaded = async (fileName) =>
      await IzuCnn.downloadMediaMessage(quoted, fileName);
    let command = (m.prefix && m.body.startsWith(m.prefix)) || false;

    if (!m.fromMe) {
      console.log(chalk.green.bold('Command:'), chalk.yellow.bold(m.body));
      console.log(chalk.green.bold('From:'), chalk.yellow.bold(m.sender));
      console.log(
        chalk.green.bold('Text:'),
        chalk.yellow.bold(m.text || 'null')
      );
    }
    const pushname = m.pushName
    
    switch (command ? m.command.toLowerCase() : false) {
      case 'menu':
      case 'allmenu':
      case 'help':
        {
          let txt = Styles(
            `Hallo ${pushname} Perkenalkan Saya ${global.nameBot}\n\n`
          );
          Object.entries(menu).map(([type, command]) => {
            txt += `${Styles(type + ' Menu')}\n\n`;
            txt += `${command.map((v) => `${'> ' + v}`).join('\n')}`;
            txt += '\n\n';
          });
          await IzuCnn.sendMessage(m.from, {
            text: txt,
            contextInfo: {
              externalAdReply: {
                title: global.nameBot,
                body: global.wm,
                thumbnailUrl: global.thumbnailUrl,
                sourceUrl: null,
                mediaType: 1,
                renderLargerThumbnail: true,
              },
            },
          });
        }
        break;
      case 'tiktok':
      case 'tiktokdl':
      case 'ttdl':
        {
          if (!m.text) return m.reply("Where's the link?");
          let res = await IzuCnn.request('/api/downloader/tiktok', {
            url: m.text,
          });
          if (res.status !== true) return m.reply("Can't fetch the link");
          await IzuCnn.sendVideo(m.from, res.url, 'Here is the video', m);
          await IzuCnn.sendMessage(
            m.from,
            {
              audio: { url: res.audio },
              mimetype: 'audio/mp4',
              ptt: true,
            },
            { quoted: m }
          );
        }
        break;
      case 'tiktokslide':
      case 'ttslide':
        {
          if (!m.text) return m.reply("Where's the link?");
          let res = await IzuCnn.request('/api/downloader/tiktokslide', {
            url: m.text,
          });
          if (res.status !== true) return m.reply("Can't fetch the link");
          for (let i of res.data) {
            await IzuCnn.sendImage(m.from, i, '', m);
          }
        }
        break;
      case 'igdl':
      case 'instagram':
      case 'ig':
        {
          if (!m.text) return m.reply("Where's the link?");
          let res = await IzuCnn.request('/api/downloader/instagram', {
            url: m.text,
          });
          if (res.status !== true) return m.reply("Can't fetch the link");
          for (let i of res.data) {
            if (i.startsWith('https://scontent.cdninstagram.com')) {
              await IzuCnn.sendImage(m.from, i, '', m);
            } else {
              await IzuCnn.sendVideo(m.from, i, '', m);
            }
          }
        }
        break;
      case 'drive':
      case 'gdrive':
      case 'googledrive':
        {
          if (!m.text) return m.reply("Where's the link?");
          if (!m.text.includes('drive.google.com'))
            return m.reply('Only support google drive link');
          let res = await IzuCnn.request('/api/downloader/drive', {
            url: m.text,
          });

          if (res.status !== true) return m.reply("Can't fetch the link");
          const mime = await getMime(res.data.download);
          const size = await getSize(res.data.download);
          if (size > 100000000) return m.reply('File is too large');
          await IzuCnn.sendMessage(
            m.from,
            {
              document: { url: res.data.download },
              fileName: res.data.name,
              mimetype: mime,
              caption: `Name: ${res.data.name}\nSize: ${await byteToSize(
                size
              )}`,
            },
            { quoted: m }
          );
        }
        break;
      case 'samehadaku':
        {
          if (!m.text) return m.reply("Where's the link?");
          if (!m.text.includes('samehadaku'))
            return m.reply('Only support samehadaku link');
          let res = await IzuCnn.request('/api/downloader/samehadaku', {
            url: m.text,
          });
          if (res.status !== true) return m.reply("Can't fetch the link");
          const video = res.data.downloads.find(
            (v) => v.name === 'Premium 720p'
          );
          const size = await getSize(video.link);
          if (size > 100000000)
            return m.reply(
              `File is too large\n\nLink Download : ${video.link}`
            );
          await IzuCnn.sendVideo(m.from, video.link, res.data.title, m);
        }
        break;
      case 'snackvideo':
      case 'snackdl':
        {
          if (!m.text) return m.reply("Where's the link?");
          let res = await IzuCnn.request('/api/downloader/snackvideo', {
            url: m.text,
          });
          if (res.status !== true) return m.reply("Can't fetch the link");
          await IzuCnn.sendVideo(m.from, res.data, '', m);
        }
        break;
      case 'spotifysearch': case 'spotifys': {
        if (!text) return m.reply(`*Contoh* : ${prefix+command} Whole Heart`)
        let result = await SearchSpotify(text)
        let caption = result.map((v, i) => {
          return {
            header: "",
            title: v.name,
            description: v.artists.map(artist => artist.name).join(', '),
            id: '.spotify ' + v.album.external_urls.spotify
          }
        })
        let msg = generateWAMessageFromContent(m.chat, {
          viewOnceMessage: {
            message: {
              messageContextInfo: {
                deviceListMetadata: {},
                deviceListMetadataVersion: 2
              },
              interactiveMessage: {
                body: {
                  text: `🔎 Hasil Pencarian Dari ${text}\nSilahkan Pilih List di bawah ini`,
                },
                footer: {
                  text: wm
                },
                header: {
                  title: "Spotify - Search",
                  subtitle: "",
                  hasMediaAttachment: false,
                },
                nativeFlowMessage: {
                  buttons: [{
                    name: "single_select",
                    buttonParamsJson: JSON.stringify({
                      title: "CLICK HERE",
                      sections: [{
                        title: "",
                        rows: caption
                      }]
                    })
                  }]
                }
              }
            }
          }
        }, {
          quoted: m
        }, {});
        await IzuCnn.relayMessage(msg.key.remoteJid, msg.message, {
          messageId: msg.key.id
        });
      }
      break
      case 'spotify': {
        if (!text) return m.reply('Masukan judul atau url lagu')
        if (text.startsWith('https://')) {
        try {
          axios.get(`https://api.ssateam.my.id/api/spotifydl?url=${text}`).then(async ({
            data
          }) => {
            let spgg = data.data.response
            await IzuCnn.sendMessage(m.chat, {
              audio: {
                url: spgg.download
              },
              mimetype: "audio/mp4",
              contextInfo: {
                externalAdReply: {
                  showAdAttribution: true,
                  mediaType: 2,
                  mediaUrl: text,
                  title: spgg.title,
                  body: "Izu-Ai",
                  sourceUrl: text,
                  thumbnailUrl: spgg.image
                }
              }
            }, {
              quoted: kalgan2
            })
          })
        } catch (error) {
          console.error(error)
        }
        } else if (text.startsWith('open.spotify.com'))
        let text = "https://" + text
        try {
          axios.get(`https://api.ssateam.my.id/api/spotifydl?url=${text}`).then(async ({
            data
          }) => {
            let spgg = data.data.response
            await IzuCnn.sendMessage(m.chat, {
              audio: {
                url: spgg.download
              },
              mimetype: "audio/mp4",
              contextInfo: {
                externalAdReply: {
                  showAdAttribution: true,
                  mediaType: 2,
                  mediaUrl: text,
                  title: spgg.title,
                  body: "Izu-Ai",
                  sourceUrl: text,
                  thumbnailUrl: spgg.image
                }
              }
            }, {
              quoted: kalgan2
            })
          })
        } catch (error) {
          console.error(error)
        } else {
        let result = await SearchSpotify(text)
        let caption = result.map((v, i) => {
          return {
            header: "",
            title: v.name,
            description: v.artists.map(artist => artist.name).join(', '),
            id: '.spotify ' + v.album.external_urls.spotify
          }
        })
        let butt = ({
          title: "CLICK HERE",
          sections: [{
          title: "",
          rows: caption
          }]
        })
        await IzuCnn.sendList(m.from, `🔎 Hasil Pencarian Dari ${text}\nSilahkan Pilih
        List di bawah ini`, `Search by Izu-Ai`, butt, m)
        }
      }
      break
      case 'spotifyd': case 'spotifydl': {
        if (!text) return m.reply(`*Contoh* : ${prefix + command} https://open.spotify.com/track/4Z1t1aMRif8ES212kTN8H2`)
        IzuCnn.sendMessage(m.chat, {
          react: {
            text: "⏱️",
            key: m.key,
          }
        })
        try {
          axios.get(`https://api.ssateam.my.id/api/spotifydl?url=${text}`).then(async ({
            data
          }) => {
            let spgg = data.data.response
            await IzuCnn.sendMessage(m.chat, {
              audio: {
                url: spgg.download
              },
              mimetype: "audio/mp4",
              contextInfo: {
                externalAdReply: {
                  showAdAttribution: true,
                  mediaType: 2,
                  mediaUrl: text,
                  title: spgg.title,
                  body: "Izu-Ai",
                  sourceUrl: text,
                  thumbnailUrl: spgg.image
                }
              }
            }, {
              quoted: kalgan2
            })
          })
        } catch (error) {
          console.error(error)
        }
      }
      break
      case 'lyrics': 
        case 'lirik':
          case 'lyric': {
            if (!text) return m.reply('Masukan judul lagu')
            axios.get(`https://widipe.com/lirik?text=${text}`).then(async({ data
            }) => {
              let teks = `Results from ${text}\n`
              teks += `Title: ${data.result.title}`
              teks += `Artist: ${data.result.artist}\n`
              teks += `Lyrics: ${data.result.lyrics}\n`
              await IzuCnn.sendButtonImg(m.from, teks, `Jika tidak sesuai, coba
              berikan yang lebih spesifik seperti artis`,[] , data.result.image, m)
            })
          }
          break
          case 'jadwalsholat': case 'jadwalsalat': case 'jadwalsolat': {
            let today = new Date();
            let daten = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;

            fetch(`https://api.aladhan.com/v1/timingsByCity?date=${daten}&city=${text}&country=Indonesia&method=20`)
            .then(response => response.json())
            .then(data => {
        console.log(data);
        let teks = `*Jadwal Sholat*`
        teks += `Kota: ${data.data}`
        m.reply(teks)
    })
    .catch(error => {
        console.error('Error:', error);
    });
          }
          break
      case 'ytmp3':
      case 'youtubeaudio':
        {
          if (!m.text) return m.reply("Where's the link?");

          let res = await IzuCnn.request('/api/downloader/youtube', {
            url: m.text,
          });
          if (res.status !== true) return m.reply("Can't fetch the link");
          const size = await getSize(res.data.audio.url);
          if (size > 15000000) return m.reply('File is too large');
          const file =
            './temp/' + (await crypto.randomBytes(16).toString('hex')) + '.mp3';
          const execPro = util.promisify(exec);
          await execPro(
            `ffmpeg -i "${res.data.audio.url}" -q:a 0 -map a "${file}"`
          );
          await IzuCnn
            .sendMessage(m.from, {
              audio: readFileSync(`${file}`),
              mimetype: 'audio/mp4',
              contextInfo: {
                externalAdReply: {
                  title: res.data.title,
                  body: global.wm,
                  thumbnailUrl: res.data.thumbnail,
                  sourceUrl: null,
                  mediaType: 1,
                  renderLargerThumbnail: true,
                },
              },
            })
            .then(() => unlink(file))
            .catch(() => {});
        }
        break;
      case 'ytmp4':
      case 'youtubevideo':
        {
          if (!m.text) return m.reply("Where's the link?");
          let res = await IzuCnn.request('/api/downloader/youtube', {
            url: m.text,
          });
          if (res.status !== true) return m.reply("Can't fetch the link");
          const size = await getSize(res.data.video.url);

          if (size > 50000000) return m.reply('File is too large');
          await IzuCnn.sendVideo(m.from, res.data.video.url, res.data.title, m);
        }
        break;
      case 'cekkhodam':
      case 'cekhodam':
        {
          if (!m.text) return m.reply("Where's the name?");
          let res = await IzuCnn.request('/api/tools/cekkhodam', {
            Name: m.text,
          });
          if (res.status !== true) return m.reply('Internal Server Error');
          let txt = `*Data Khodam*\n\n`;
          txt += `*Name:* ${res.data.nama}\n`;
          txt += `*Khodam:* ${res.data.khodam}\n`;
          txt += `*Share:* ${res.data.share}\n`;
          m.reply(txt);
        }
        break;
        
      case 'akinator':
      case 'aki': {
      const {
  Aki
} = require('aki-api')
        let sections = [{
            'title': "Opsi 1",
            'highlight_label': 'Jawaban ke 0',
            'rows': [{
              'title': 'Ya',
              'description': 'Aku menjawab iya',
              'id': `${prefix+command} a 0`
            }]
          }, {
            'title': "Opsi 2",
            'highlight_label': 'Jawaban ke 1',
            'rows': [{
              'title': 'Tidak',
              'description': 'Aku menjawab tidak',
              'id': `${prefix+command} a 1`
            }]
          }, {
            'title': "Opsi 3",
            'highlight_label': 'Jawaban le 2',
            'rows': [{
              'title': "Saya Tidak Tahu",
              'description': 'Aku menjawab tidak tahu',
              'id': `${prefix+command} a 2`
            }]
          }, {
            'title': "Opsi 4",
            'highlight_label': 'Jawaban ke 3',
            'rows': [{
              'title': 'Mungkin',
              'description': 'Aku menjawab mungkin',
              'id': `${prefix+command} a 3`
            }]
          }, {
            'title': "Opsi 5",
            'highlight_label': 'Jawaban ke 4',
            'rows': [{
              'title': "Mungkin Tidak",
              'description': 'Aku menjawab mungkin tidak',
              'id': `${prefix+command} a 4`
            }]
          }, {
            'title': "Pilihan game",
            'highlight_label': "",
            'rows': [{
              'title': "Berhenti",
              'description': 'Berhenti bermain',
              'id': `${prefix+command} end`
            },
            {
              'title': "Mulai ulang",
              'description': 'Mulai ulang game',
              'id': `${prefix+command} restart`
            }
            ]
          }]
          let listjwb = {
            title: '「Pilih」',
            sections
          };
          
        if (isBot) return;
        {
          TsuCnn.akinator = TsuCnn.akinator ? TsuCnn.akinator : {};
          const cmdAki = args[0]?.toLowerCase();
          if (cmdAki === "end") {
            if (!(m.sender in TsuCnn.akinator)) {
              return m.reply("Anda tidak sedang dalam sesi Akinator");
            }
            delete TsuCnn.akinator[m.sender];
            m.reply("Berhasil keluar dari sesi Akinator.");
          }
          if (cmdAki === "start") {
            if (m.sender in TsuCnn.akinator) {
              return m.reply("Anda masih berada dalam sesi Akinator");
            }
            TsuCnn.akinator[m.sender] = new Aki({
              region: "id"
            });
            await TsuCnn.akinator[m.sender].start();
            let {
              question
            } = TsuCnn.akinator[m.sender];
            let teaki = "🎮 *Akinator* 🎮\n\n`Pertanyaan` : \n" + question + "\n\n0. *Ya*\n1. *Tidak*\n2. *Saya Tidak Tahu*\n3. *Mungkin*\n4. *Mungkin Tidak*\n\nHint :\n*" + (prefix + command) + " a 0* itu ngarah ke jawaban ke \"Ya\"\n*" + (prefix + command) + " end* untuk keluar dari sesi Akinator";
            TsuCnn.akinator[m.sender].chat = TsuCnn.sendListWithImage(m.chat, teaki, listjwb, Styles('atau pilih di bawah'), 'https://i.ibb.co.com/yPjMQ91/20240807-190104.jpg', m);
            TsuCnn.akinator[m.sender].waktu = setTimeout(() => {
              m.reply("Waktu Memilih Akinator Habis");
              delete TsuCnn.akinator[m.sender];
            }, 300000);
          }
          if (cmdAki === "a") {
            if (!(m.sender in TsuCnn.akinator)) {
              return m.reply("Anda tidak sedang dalam sesi Akinator");
            }
            if (!args[1]) {
              return m.reply("Masukan Jawaban Kamu!");
            }
            if (!/0|1|2|3|4/i.test(args[1])) {
              return m.reply("Invalid Number");
            }
            clearTimeout(TsuCnn.akinator[m.sender].waktu);
            await TsuCnn.akinator[m.sender].step(args[1]);
            let {
              guess,
              question,
              currentStep,
              progress
            } = TsuCnn.akinator[m.sender];
            if (guess != undefined) {
              const teksj = "🎮 *Akinator Answer*\n\nDia Adalah..\nNama : " + guess.name_proposition + "\nDeskripsi : " + guess.description_proposition;
              /*TsuCnn.sendMessage(m.chat, {
                image: {
                  url: guess.photo
                },
                caption: teksj
              }, {
                quoted: m
              });*/
            let buttons = [{
             type: "buttons",
             text: "Main lagi",
             id: `${prefix}aki start`
             }]
              
              TsuCnn.sendButtonImg(m.chat, teksj, Styles('akinator by tsumuri-md'), buttons, guess.photo, m)
//TsuCnn.sendButtonWithImg(m.chat, teksj, 'Main Lagi', 'aki start', 'ᴀᴋɪɴᴀᴛᴏʀ ʙʏ ʟᴜʜᴜɴɢᴄʜ', guess.photo, m)
              delete TsuCnn.akinator[m.sender];
            } else {
              let teksa = "🎮 *Akinator* 🎮\n\n`Step` : " + currentStep + " ( " + progress.toFixed(2) + " % )\n`Pertanyaan` : \n" + question + "\n\n0. *Ya*\n1. *Tidak*\n2. *Saya Tidak Tahu*\n3. *Mungkin*\n4. *Mungkin Tidak*";
              TsuCnn.akinator[m.sender].chat = await TsuCnn.sendListWithImage(m.chat, teksa, listjwb, Styles('pilih di bawah'), 'https://i.ibb.co.com/yPjMQ91/20240807-190104.jpg', m);
              TsuCnn.akinator[m.sender].waktu = setTimeout(() => {
                m.reply("Waktu Memilih Akinator Habis");
                delete TsuCnn.akinator[m.sender];
              }, 300000);
            }
          }
          if (cmdAki === "restart") {
          if (!(m.sender in TsuCnn.akinator)) {
              return m.reply("Anda tidak sedang dalam sesi Akinator");
            }
            delete TsuCnn.akinator[m.sender];
            TsuCnn.akinator[m.sender] = new Aki({
              region: "id"
            });
            await TsuCnn.akinator[m.sender].start();
            let {
              question
            } = TsuCnn.akinator[m.sender];
            let teaki = "🎮 *Akinator* 🎮\n\n`Pertanyaan` : \n" + question + "\n\n0. *Ya*\n1. *Tidak*\n2. *Saya Tidak Tahu*\n3. *Mungkin*\n4. *Mungkin Tidak*\n\nHint :\n*" + (prefix + command) + " a 0* itu ngarah ke jawaban ke \"Ya\"\n*" + (prefix + command) + " end* untuk keluar dari sesi Akinator";
            TsuCnn.akinator[m.sender].chat = await TsuCnn.sendList(m.chat, teksa, Styles('Atau pilih di bawah'), listjwb, m);
            TsuCnn.akinator[m.sender].waktu = setTimeout(() => {
              m.reply("Waktu Memilih Akinator Habis");
              delete TsuCnn.akinator[m.sender];
            }, 300000);
          }
          if (cmdAki === "help") {
            let teksh = "Akinator adalah sebuah permainan dan aplikasi perangkat bergerak yang berupaya menebak secara rinci dan pasti isi pikiran pengguna permainan ini melalui serentetan pertanyaan.\n\n🎮 _*Cara Bermain:*_\n" + (prefix + command) + " start ~ Untuk Memulai Permainan\n"  + (prefix + command) + " restart ~ Untuk Memulai Ulang Permainan\n" + (prefix + command) + " end ~ Untuk Menghapus Sesi Permainan\n" + (prefix + command) + " a <number> ~ Untuk Menjawab Pertanyaan";
            replyak2(teksh);
          }
          if (!text) {
            m.reply("Command salah, silakan lihat di " + (prefix + command) + " help");
          }
        }
        }
        break;

      default:
        if (
          ['>', 'eval'].some((a) => m.command.toLowerCase().startsWith(a)) &&
          isOwners
        ) {
          let evalCmd = '';
          try {
            evalCmd = /await/i.test(m.text)
              ? eval('(async() => { ' + m.text + ' })()')
              : eval(m.text);
          } catch (e) {
            evalCmd = e;
          }
          new Promise((resolve, reject) => {
            try {
              resolve(evalCmd);
            } catch (err) {
              reject(err);
            }
          })
            ?.then((res) => m.reply(util.fromat(res)))
            ?.catch((err) => m.reply(util.fromat(err)));
        }
        if (
          ['$', 'exec'].some((a) => m.command.toLowerCase().startsWith(a)) &&
          isOwners
        ) {
          try {
            exec(m.text, async (err, stdout) => {
              if (err) return m.reply(util.fromat(err));
              if (stdout) return m.reply(util.fromat(stdout));
            });
          } catch (e) {
            await m.reply(util.fromat(e));
          }
        }
    }
  } catch (e) {
    console.error(e);
  }
}

let fileP = fileURLToPath(import.meta.url);
watchFile(fileP, () => {
  unwatchFile(fileP);
  console.log(`Successfully To Update File ${fileP}`);
});
