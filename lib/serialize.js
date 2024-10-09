import '../config.js';
import axios from 'axios';
import {
	parsePhoneNumber
} from 'libphonenumber-js';
import {
	fileTypeFromBuffer
} from 'file-type';
import {
	escapeRegExp
} from './functions.js';
import {
	fileURLToPath
} from 'url';
import {
	unwatchFile,
	watchFile
} from 'fs';
import baileys from '@xyzendev/baileys';

const {
	areJidsSameUser,
	extractMessageContent,
	jidNormalizedUser
} = baileys;

export function getContentType(a) {
	if (a) {
		const keys = Object.keys(a);
		const key = keys.find(
			(k) =>
			(k === 'conversation' ||
				k.endsWith('Message') ||
				k.includes('V2') ||
				k.includes('V3')) &&
			k !== 'senderKeyDistributionMessage'
		);
		return key ? key : keys[0];
	}
}

export function Modules({
	IzuCnn,
	store
}) {
	const IzuCnn = Object.defineProperties(IzuCnn, {
		request: {
			value(endpoint, params = {}) {
				return new Promise(async (resolve, reject) => {
					await axios({
							baseURL: 'https://api.xyzen.tech',
							url: endpoint,
							method: 'GET',
							params: {
								...params,
								apikey: global.apikey,
							},
							headers: {
								'Content-Type': 'application/json',
								'User-Agent': 'ZYD-USERS',
							},
						})
						.then((res) => resolve(res.data))
						.catch((err) => reject(err));
				});
			},
		},
		sendVideo: {
			async value(jid, url, caption, quoted) {
				return await IzuCnn.sendMessage(
					jid, {
						video: {
							url
						},
						caption,
					}, {
						quoted
					}
				);
			},
		},
		sendImage: {
			async value(jid, url, caption, quoted) {
				return await IzuCnn.sendMessage(
					jid, {
						image: {
							url
						},
						caption,
					}, {
						quoted
					}
				);
			},
		},
		getName: {
			async value(jid) {
				let id = jidNormalizedUser(jid);
				if (id.endsWith('g.us')) {
					let metadata =
						store.groupMetadata?.[id] || (await IzuCnn.groupMetadata(id));
					return metadata.subject;
				} else {
					let metadata = store.contacts[id];
					return (
						metadata?.name ||
						metadata?.verifiedName ||
						metadata?.notify ||
						parsePhoneNumber('+' + id.split('@')[0]).format('INTERNATIONAL')
					);
				}
			},
		},

		sendContact: {
			async value(jid, number, quoted, options = {}) {
				let list = [];
				for (let v of number) {
					if (v.endsWith('g.us')) continue;
					v = v.replace(/\D+/g, '');
					list.push({
						displayName: await IzuCnn.getName(v + '@s.whatsapp.net'),
						vcard: `BEGIN: VCARD\nVERSION: 3.0\nN: ${await IzuCnn.getName(
              v + '@s.whatsapp.net'
            )}\nFN: ${await IzuCnn.getName(
              v + '@s.whatsapp.net'
            )}\nitem1.TEL; waid=${v}: ${v}\nEND: VCARD`,
					});
				}
				return IzuCnn.sendMessage(
					jid, {
						contacts: {
							displayName: `${list.length} Contact`,
							contacts: list,
						},
					}, {
						quoted,
						...options
					}
				);
			},
			enumerable: true,
		},

		// Button nya bisa banyak
		sendButton: {
			async value(jid, text = "", footer = "", buttons = [], quoted = null) {
				try {
					let interactiveButtons = buttons.map(button => {
						if (button.type === 'url') {
							return {
								name: "cta_url",
								buttonParamsJson: JSON.stringify({
									display_text: button.text,
									url: button.url,
									merchant_url: button.url
								})
							};
						} else if (button.type === 'copy') {
							return {
								name: "cta_copy",
								buttonParamsJson: JSON.stringify({
									display_text: button.text,
									id: button.id,
									copy_code: button.copy_code
								})
							};
						} else if (button.type === 'buttons') {
							return {
								name: "quick_reply",
								buttonParamsJson: JSON.stringify({
									display_text: button.text,
									id: button.id
								})
							};
						}
					});

					let msg = generateWAMessageFromContent(jid, {
						viewOnceMessage: {
							message: {
								messageContextInfo: {
									deviceListMetadata: {},
									deviceListMetadataVersion: 2
								},
								interactiveMessage: proto.Message.InteractiveMessage.create({
									body: proto.Message.InteractiveMessage.Body.create({
										text
									}),
									footer: proto.Message.InteractiveMessage.Footer.create({
										text: footer
									}),
									header: proto.Message.InteractiveMessage.Header.create({
										hasMediaAttachment: false
									}),
									nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
										buttons: interactiveButtons
									})
								})
							}
						}
					}, {
						userJid: jid,
						quoted: quoted
					});

					await IzuCnn.relayMessage(jid, msg.message, {
						messageId: msg.key.id
					});
				} catch (e) {
					console.error("Error sending button message:", e);
				}
			},
		},
		// Button nya bisa banyak dengan img
		sendButtonImg: {
			async value(jid, text = "", footer = "", buttons = [], imageUrl = "", quoted = null) {
				try {
					console.log('imageUrl:', imageUrl, 'Type:', typeof imageUrl);
					if (typeof imageUrl !== 'string') {
						throw new TypeError('The "imageUrl" argument must be of type string.');
					}
					let interactiveButtons = buttons.map(button => {
						if (button.type === 'url') {
							return {
								name: "cta_url",
								buttonParamsJson: JSON.stringify({
									display_text: button.text,
									url: button.url,
									merchant_url: button.url
								})
							};
						} else if (button.type === 'copy') {
							return {
								name: "cta_copy",
								buttonParamsJson: JSON.stringify({
									display_text: button.text,
									id: button.id,
									copy_code: button.copy_code
								})
							};
						} else if (button.type === 'buttons') {
							return {
								name: "quick_reply",
								buttonParamsJson: JSON.stringify({
									display_text: button.text,
									id: button.id
								})
							};
						}
						/*else if (button.type === 'select') {
						             let sections = buttons;
						             let listMessage = {
						               title: title,
						               sections
						               };
						               return {
						                   name: "single_select",
						                   buttonParamsJson: JSON.stringify({
						                   listMessage
						                   })
						               };
						           }*/
					});

					let preparedMedia = await prepareWAMessageMedia({
						image: {
							url: imageUrl
						}
					}, {
						upload: IzuCnn.waUploadToServer
					});
					let msg = generateWAMessageFromContent(jid, {
						viewOnceMessage: {
							message: {
								messageContextInfo: {
									deviceListMetadata: {},
									deviceListMetadataVersion: 2
								},
								interactiveMessage: proto.Message.InteractiveMessage.create({
									body: proto.Message.InteractiveMessage.Body.create({
										text
									}),
									footer: proto.Message.InteractiveMessage.Footer.create({
										text: footer
									}),
									header: proto.Message.InteractiveMessage.Header.create({
										hasMediaAttachment: true,
										...preparedMedia
									}),
									nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
										buttons: interactiveButtons
									})
								})
							}
						}
					}, {
						userJid: jid,
						quoted: quoted
					});

					await IzuCnn.relayMessage(jid, msg.message, {
						messageId: msg.key.id
					});
				} catch (e) {
					console.error("Error sending button message:", e);
				}
			},
		},
		/**
		 * Function Send Button Biar Hemat Energi ngetik
		 * Ini send Button Biasa
		 */
		sendButtonMsg: {
			async value(jid, text = "", footer = "", buttons = [], quoted = null) {
				try {
					let msg = generateWAMessageFromContent(jid, {
						viewOnceMessage: {
							message: {
								"messageContextInfo": {
									"deviceListMetadata": {},
									"deviceListMetadataVersion": 2
								},
								interactiveMessage: proto.Message.InteractiveMessage.create({
									body: proto.Message.InteractiveMessage.Body.create({
										text: text
									}),
									footer: proto.Message.InteractiveMessage.Footer.create({
										text: footer
									}),
									header: proto.Message.InteractiveMessage.Header.create({
										hasMediaAttachment: false
									}),
									nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
										buttons: buttons.map(button => ({
											"name": "quick_reply",
											"buttonParamsJson": JSON.stringify({
												"display_text": button.text,
												"id": button.id
											})
										}))
									})
								})
							}
						}
					}, {
						userJid: jid,
						quoted: quoted
					});

					await IzuCnn.relayMessage(msg.key.remoteJid, msg.message, {
						messageId: msg.key.id
					});
				} catch (e) {
					console.error("Error sending button message:", e);
				}
			},
		},
		/**
		 * Ini Function Send Button Yang Ada Gambarnya
		 */
		sendButtonMsgImg: {
			async value(jid, text = "", footer = "", buttons = [], imageUrl = "", quoted = null) {
				try {
					console.log('imageUrl:', imageUrl, 'Type:', typeof imageUrl);
					if (typeof imageUrl !== 'string') {
						throw new TypeError('The "imageUrl" argument must be of type string.');
					}
					let preparedMedia = await prepareWAMessageMedia({
						image: {
							url: imageUrl
						}
					}, {
						upload: IzuCnn.waUploadToServer
					});
					let msg = generateWAMessageFromContent(jid, {
						viewOnceMessage: {
							message: {
								"messageContextInfo": {
									"deviceListMetadata": {},
									"deviceListMetadataVersion": 2
								},
								interactiveMessage: proto.Message.InteractiveMessage.create({
									body: proto.Message.InteractiveMessage.Body.create({
										text: text
									}),
									footer: proto.Message.InteractiveMessage.Footer.create({
										text: footer
									}),
									header: proto.Message.InteractiveMessage.Header.create({
										title: '',
										hasMediaAttachment: true,
										...preparedMedia
									}),
									nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
										buttons: buttons.map(button => ({
											"name": "quick_reply",
											"buttonParamsJson": JSON.stringify({
												"display_text": button.text,
												"id": button.id
											})
										}))
									})
								})
							}
						}
					}, {
						userJid: jid,
						quoted: quoted
					});

					await IzuCnn.relayMessage(msg.key.remoteJid, msg.message, {
						messageId: msg.key.id
					});
				} catch (e) {
					console.error("Error sending button message:", e);
				}
			},
		},

		sendButtonCard: {
			async value(jid, text, footer, cards, quoted = null) {
				try {
					let preparedCards = await Promise.all(cards.map(async (card) => {
						let preparedMedia = await prepareWAMessageMedia({
							image: {
								url: card.imageUrl
							}
						}, {
							upload: IzuCnn.waUploadToServer
						});
						return {
							body: proto.Message.InteractiveMessage.Body.fromObject({
								text: card.body
							}),
							footer: proto.Message.InteractiveMessage.Footer.fromObject({
								text: card.footer
							}),
							header: proto.Message.InteractiveMessage.Header.fromObject({
								title: card.header,
								hasMediaAttachment: true,
								...preparedMedia
							}),
							nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
								buttons: card.buttons.map(button => {
									if (button.type === 'url') {
										return {
											name: "cta_url",
											buttonParamsJson: JSON.stringify({
												display_text: button.text,
												url: button.url,
												merchant_url: button.url
											})
										};
									} else if (button.type === 'buttons') {
										return {
											name: "quick_reply",
											buttonParamsJson: JSON.stringify({
												display_text: button.text,
												id: button.id
											})
										};
									}
								})
							})
						};
					}));

					let msg = generateWAMessageFromContent(jid, {
						viewOnceMessage: {
							message: {
								messageContextInfo: {
									deviceListMetadata: {},
									deviceListMetadataVersion: 2
								},
								interactiveMessage: proto.Message.InteractiveMessage.fromObject({
									body: proto.Message.InteractiveMessage.Body.fromObject({
										text
									}),
									footer: proto.Message.InteractiveMessage.Footer.fromObject({
										text: footer
									}),
									header: proto.Message.InteractiveMessage.Header.fromObject({
										hasMediaAttachment: false
									}),
									carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({
										cards: preparedCards
									})
								})
							}
						}
					}, {
						userJid: jid,
						quoted: quoted
					});

					await IzuCnn.relayMessage(jid, msg.message, {
						messageId: msg.key.id
					});
				} catch (e) {
					console.error("Error sending button card message:", e);
				}
			},
		},

		sendListImg: {
			async value(jid, bodyteks, listmsg, foter, urlthum, quot = {}) {
				let msgss = generateWAMessageFromContent(jid, {
					viewOnceMessage: {
						message: {
							messageContextInfo: {
								deviceListMetadata: {},
								deviceListMetadataVersion: 2
							},
							interactiveMessage: proto.Message.InteractiveMessage.create({
								...quot,
								body: proto.Message.InteractiveMessage.Body.create({
									text: bodyteks
								}),
								footer: proto.Message.InteractiveMessage.Footer.create({
									text: foter
								}),
								header: proto.Message.InteractiveMessage.Header.create({
									hasMediaAttachment: true,
									...(await prepareWAMessageMedia({
										image: {
											url: urlthum
										}
									}, {
										upload: IzuCnn.waUploadToServer
									}))
								}),
								nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
									buttons: [{
										name: "single_select",
										buttonParamsJson: JSON.stringify(listmsg)
									}]
								})
							})
						}
					}
				}, {
					quoted: quot || m
				});
				await IzuCnn.relayMessage(msgss.key.remoteJid, msgss.message, {
					messageId: msgss.key.id,
					quoted: quot || m
				});
			},
		},

		sendList: {
			async value(jid, bodyteks, foterteks, listmsg, quote = {}) {
				let msgs = generateWAMessageFromContent(jid, {
					viewOnceMessage: {
						message: {
							messageContextInfo: {
								deviceListMetadata: {},
								deviceListMetadataVersion: 2
							},
							interactiveMessage: proto.Message.InteractiveMessage.create({
								...quote,
								body: proto.Message.InteractiveMessage.Body.create({
									text: bodyteks
								}),
								footer: proto.Message.InteractiveMessage.Footer.create({
									text: foterteks || "Powered By KayyTwelve"
								}),
								nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
									buttons: [{
										name: "single_select",
										buttonParamsJson: JSON.stringify(listmsg)
									}]
								})
							})
						}
					}
				}, {});
				return await IzuCnn.relayMessage(msgs.key.remoteJid, msgs.message, {
					messageId: msgs.key.id
				});
			},
		},

		parseMention: {
			value(text) {
				return (
					[...text.matchAll(/@([0-9]{5,16}|0)/g)].map(
						(v) => v[1] + '@s.whatsapp.net'
					) || []
				);
			},
		},

		downloadMediaMessage: {
			async value(message, filename) {
				let media = await downloadMediaMessage(
					message,
					'buffer', {}, {
						logger: pino({
							timestamp: () => `, "time": "${new Date().toJSON()}"`,
							level: 'fatal',
						}).child({
							class: 'xyzen'
						}),
						reuploadRequest: IzuCnn.updateMediaMessage,
					}
				);

				if (filename) {
					let mime = await fileTypeFromBuffer(media);
					let filePath = path.join(process.cwd(), `${filename}.${mime.ext}`);
					fs.promises.writeFile(filePath, media);
					return filePath;
				}

				return media;
			},
			enumerable: true,
		},

		cMod: {
			value(jid, copy, text = '', sender = IzuCnn.user.id, options = {}) {
				let mtype = getContentType(copy.message);
				let content = copy.message[mtype];
				if (typeof content === 'string') copy.message[mtype] = text || content;
				else if (content.caption) content.caption = text || content.caption;
				else if (content.text) content.text = text || content.text;
				if (typeof content !== 'string') {
					copy.message[mtype] = {
						...content,
						...options
					};
					copy.message[mtype].contextInfo = {
						...(content.contextInfo || {}),
						mentionedJid: options.mentions || content.contextInfo?.mentionedJid || [],
					};
				}
				if (copy.key.participant)
					sender = copy.key.participant = sender || copy.key.participant;
				if (copy.key.remoteJid.includes('@s.whatsapp.net'))
					sender = sender || copy.key.remoteJid;
				else if (copy.key.remoteJid.includes('@broadcast'))
					sender = sender || copy.key.remoteJid;
				copy.key.remoteJid = jid;
				copy.key.fromMe = areJidsSameUser(sender, IzuCnn.user.id);
				return baileys.proto.WebMessageInfo.fromObject(copy);
			},
			enumerable: false,
		},
	});
	return IzuCnn;
}

export default async function serialize(IzuCnn, msg, store) {
	const m = {};

	if (!msg.message) return;

	// oke
	if (!msg) return msg;

	//let M = proto.WebMessageInfo
	m.message = parseMessage(msg.message);

	if (msg.key) {
		m.key = msg.key;
		m.from = m.key.remoteJid.startsWith('status') ?
			jidNormalizedUser(m.key?.participant || msg.participant) :
			jidNormalizedUser(m.key.remoteJid);
		m.fromMe = m.key.fromMe;
		m.id = m.key.id;
		m.device = /^3A/.test(m.id) ?
			'ios' :
			m.id.startsWith('3EB') ?
			'web' :
			/^.{21}/.test(m.id) ?
			'android' :
			/^.{18}/.test(m.id) ?
			'desktop' :
			'unknown';
		m.isGroup = m.from.endsWith('@g.us');
		m.participant =
			jidNormalizedUser(msg?.participant || m.key.participant) || false;
		m.sender = jidNormalizedUser(
			m.fromMe ? IzuCnn.user.id : m.isGroup ? m.participant : m.from
		);
	}

	if (m.isGroup) {
		if (!(m.from in store.groupMetadata))
			store.groupMetadata[m.from] = await IzuCnn.groupMetadata(m.from);
		m.metadata = store.groupMetadata[m.from];
		m.groupAdmins =
			m.isGroup &&
			m.metadata.participants.reduce(
				(memberAdmin, memberNow) =>
				(memberNow.admin ?
					memberAdmin.push({
						id: memberNow.id,
						admin: memberNow.admin
					}) :
					[...memberAdmin]) && memberAdmin,
				[]
			);
		m.isAdmin =
			m.isGroup && !!m.groupAdmins.find((member) => member.id === m.sender);
		m.isBotAdmin =
			m.isGroup &&
			!!m.groupAdmins.find(
				(member) => member.id === jidNormalizedUser(IzuCnn.user.id)
			);
	}

	m.pushName = msg.pushName;
	m.isOwner = global.owner.includes(m.sender.split('@')[0]);

	if (m.message) {
		m.type = getContentType(m.message) || Object.keys(m.message)[0];
		m.msg = parseMessage(m.message[m.type]) || m.message[m.type];
		m.mentions = [
			...(m.msg?.contextInfo?.mentionedJid || []),
			...(m.msg?.contextInfo?.groupMentions?.map((v) => v.groupJid) || []),
		];
		m.body =
			m.msg?.text ||
			m.msg?.conversation ||
			m.msg?.caption ||
			m.message?.conversation ||
			m.msg?.selectedButtonId ||
			m.msg?.singleSelectReply?.selectedRowId ||
			m.msg?.selectedId ||
			m.msg?.contentText ||
			m.msg?.selectedDisplayText ||
			m.msg?.title ||
			m.msg?.name ||
			'';
		m.prefix = new RegExp('^[°•π÷×¶∆£¢€¥®™+✓=|/~!?@#%^&.©^]', 'gi').test(m.body) ?
			m.body.match(new RegExp('^[°•π÷×¶∆£¢€¥®™+✓=|/~!?@#%^&.©^]', 'gi'))[0] :
			'';
		m.command =
			m.body && m.body.trim().replace(m.prefix, '').trim().split(/ +/).shift();
		m.args =
			m.body
			.trim()
			.replace(new RegExp('^' + escapeRegExp(m.prefix), 'i'), '')
			.replace(m.command, '')
			.split(/ +/)
			.filter((a) => a) || [];
		m.text = m.args.join(' ').trim();
		m.expiration = m.msg?.contextInfo?.expiration || 0;
		m.timestamps =
			typeof msg.messageTimestamp === 'number' ?
			msg.messageTimestamp * 1000 :
			m.msg.timestampMs * 1000;
		m.isMedia = !!m.msg?.mimetype || !!m.msg?.thumbnailDirectPath;

		m.isQuoted = false;
		if (m.msg?.contextInfo?.quotedMessage) {
			m.isQuoted = true;
			m.quoted = {};
			m.quoted.message = parseMessage(m.msg?.contextInfo?.quotedMessage);

			if (m.quoted.message) {
				m.quoted.type =
					getContentType(m.quoted.message) || Object.keys(m.quoted.message)[0];
				m.quoted.msg =
					parseMessage(m.quoted.message[m.quoted.type]) ||
					m.quoted.message[m.quoted.type];
				m.quoted.isMedia = !!m.quoted.msg?.mimetype || !!m.quoted.msg?.thumbnailDirectPath;
				m.quoted.key = {
					remoteJid: m.msg?.contextInfo?.remoteJid || m.from,
					participant: jidNormalizedUser(m.msg?.contextInfo?.participant),
					fromMe: areJidsSameUser(
						jidNormalizedUser(m.msg?.contextInfo?.participant),
						jidNormalizedUser(IzuCnn?.user?.id)
					),
					id: m.msg?.contextInfo?.stanzaId,
				};
				m.quoted.from = /g\.us|status/.test(m.msg?.contextInfo?.remoteJid) ?
					m.quoted.key.participant :
					m.quoted.key.remoteJid;
				m.quoted.fromMe = m.quoted.key.fromMe;
				m.quoted.id = m.msg?.contextInfo?.stanzaId;
				m.quoted.device = /^3A/.test(m.quoted.id) ?
					'ios' :
					/^3E/.test(m.quoted.id) ?
					'web' :
					/^.{21}/.test(m.quoted.id) ?
					'android' :
					/^.{18}/.test(m.quoted.id) ?
					'desktop' :
					'unknown';
				m.quoted.isGroup = m.quoted.from.endsWith('@g.us');
				m.quoted.participant =
					jidNormalizedUser(m.msg?.contextInfo?.participant) || false;
				m.quoted.sender = jidNormalizedUser(
					m.msg?.contextInfo?.participant || m.quoted.from
				);
				m.quoted.mentions = [
					...(m.quoted.msg?.contextInfo?.mentionedJid || []),
					...(m.quoted.msg?.contextInfo?.groupMentions?.map(
						(v) => v.groupJid
					) || []),
				];
				m.quoted.body =
					m.quoted.msg?.text ||
					m.quoted.msg?.caption ||
					m.quoted?.message?.conversation ||
					m.quoted.msg?.selectedButtonId ||
					m.quoted.msg?.singleSelectReply?.selectedRowId ||
					m.quoted.msg?.selectedId ||
					m.quoted.msg?.contentText ||
					m.quoted.msg?.selectedDisplayText ||
					m.quoted.msg?.title ||
					m.quoted?.msg?.name ||
					'';
				m.quoted.prefix = new RegExp(
						'^[°•π÷×¶∆£¢€¥®™+✓=|/~!?@#%^&.©^]',
						'gi'
					).test(m.quoted.body) ?
					m.quoted.body.match(
						new RegExp('^[°•π÷×¶∆£¢€¥®™+✓=|/~!?@#%^&.©^]', 'gi')
					)[0] :
					'';
				m.quoted.command =
					m.quoted.body &&
					m.quoted.body.replace(m.quoted.prefix, '').trim().split(/ +/).shift();
				m.quoted.args =
					m.quoted.body
					.trim()
					.replace(new RegExp('^' + escapeRegExp(m.quoted.prefix), 'i'), '')
					.replace(m.quoted.command, '')
					.split(/ +/)
					.filter((a) => a) || [];
				m.quoted.text = m.quoted.args.join(' ').trim() || m.quoted.body;
			}
		}
	}

	m.reply = async (text, options = {}) => {
		if (typeof text === 'string') {
			return await IzuCnn.sendMessage(
				m.from, {
					text,
					...options
				}, {
					quoted: m,
					ephemeralExpiration: m.expiration,
					...options
				}
			);
		} else if (typeof text === 'object' && typeof text !== 'string') {
			return IzuCnn.sendMessage(
				m.from, {
					...text,
					...options
				}, {
					quoted: m,
					ephemeralExpiration: m.expiration,
					...options
				}
			);
		}
	};

	return m;
}

function parseMessage(content) {
	content = extractMessageContent(content);

	if (content && content.viewOnceMessageV2Extension) {
		content = content.viewOnceMessageV2Extension.message;
	}
	if (
		content &&
		content.protocolMessage &&
		content.protocolMessage.type == 14
	) {
		let type = getContentType(content.protocolMessage);
		content = content.protocolMessage[type];
	}
	if (content && content.message) {
		let type = getContentType(content.message);
		content = content.message[type];
	}

	return content;
}

let fileP = fileURLToPath(import.meta.url);
watchFile(fileP, () => {
	unwatchFile(fileP);
	console.log(`Successfully To Update File ${fileP}`);
});