const Discord = require('discord.js'),
	bot = new Discord.Client(),
	colors = require('colors'),
	prompts = require('prompts'),
	CryptoJS = require('crypto-js'),
	fs = require('fs');

process.title = 'WannabeSelfish - WANNABE1337.xyz';
console.log(`%s
%s`, ` ________                           __           _______         __   ___ __         __    
|  |  |  |.---.-.-----.-----.---.-.|  |--.-----.|     __|.-----.|  |.'  _|__|.-----.|  |--.
|  |  |  ||  _  |     |     |  _  ||  _  |  -__||__     ||  -__||  ||   _|  ||__ --||     |
|________||___._|__|__|__|__|___._||_____|_____||_______||_____||__||__| |__||_____||__|__|`.rainbow, 'by WANNABE1337.xyz\r\n'.red);


/**
 * Initialize the login attempt
 */
let config = '';

try {
	config = require('./config.json');

	login().then((token) => {
		bot.login(token).catch((e) => console.error(e.message.red.bold));
	});
} catch {
	console.log('Could not locate the config file, Attempting to recreate it.'.red);

	register().then((response) => {
		fs.writeFileSync('./config.json', JSON.stringify({ prefix: response.prefix, token: response.token }));
		console.log(`Successfully registered your token, you can now launch script and use it.`.green);
	});
}

bot.on('ready', () => {
	console.log(`Logged in as %s`.cyan, bot.user.tag.bold);
});

bot.on('message', (message) => {
	if (message.author.id !== bot.user.id) return;
	if (!message.content.startsWith(config.prefix)) return;

	let msg = message.content,
		prefix = config.prefix,
		msgArg = msg.slice(prefix.length).split(/ +/),
		msgCommand = msgArg.shift().toLowerCase(),
		msgWithoutCommandName = msg.slice((prefix + msgCommand + 1).length);

	/**
	 * List command with their usage
	 */
	if (msgCommand === 'help') {
		message.delete();
		console.log(`
Welcome to the command help center.

Command Prefix => ${prefix.bold}

${prefix}${'help'.bold} => Self describing.
${prefix}${'guild_message'.bold} => Attempt to send a message to every member from a guild/group.
${prefix}${'message_all'.bold} => Send a message to all the users you had a talk/interaction with.
${prefix}[${'purge'.bold}, ${'prune'.bold}] {${'Number of Messages'.bold}} => Self describing.
${prefix}[${'purge_all'.bold}, ${'prune_all'.bold}] => Delete every message you sent in all private conversation you had.
${prefix}[${'cm'.bold}, ${'count_messages'.bold}] => Count then send the number of message you wrote on a channel.
${prefix}[${'sp'.bold}, ${'spam'.bold}] {${'Number of Messages'.bold}} {${'Message'.bold}} => Self describing.
${prefix}${'lfe'.bold} {${'Repetition'.bold}} {${'Message'.bold}} => Logger Fucker by edition, Will edit a message many times in order to spam logger plugins.
${prefix}${'lfd'.bold} {${'Repetition'.bold}} {${'Message'.bold}} => Logger Fucker by deletion, Will send then delete many message in order to spam logger plugins.`.cyan);
	}

	/**
	 * Guild Mass message send
	 */
	if (msgCommand === 'guild_message') {
		message.delete();
		let dmGuild = message.guild;
		if (!msgWithoutCommandName || msgWithoutCommandName.length <= 0) return;

		dmGuild.members.forEach(member => {
			if (member.id === bot.user.id) return;
			console.log(`Trying to message %s`.cyan, `${member.user.username}#${member.user.discriminator}`.bold);
			member.send(msgWithoutCommandName).catch(() => console.log(`Could not message %s`.red, `${member.user.username}#${member.user.discriminator}`.bold));
		});
	}

	/**
	 * Send a message to all the users you had a talk/interaction with
	 */
	if (msgCommand === 'message_all') {
		message.delete();
		if (!msgWithoutCommandName || msgWithoutCommandName.length <= 0) return;

		bot.user.client.users.forEach(member => {
			console.log(`Trying to message %s`.cyan, `${member.username}#${member.discriminator}`.bold);
			bot.users.get(member.id).send(msgWithoutCommandName).catch(() => console.log(`Could not message %s`.red, `${member.username}#${member.discriminator}`.bold));
		});
	}

	/**
	 * Purge messages
	 * <Number Of Messages>
	 */
	if (msgCommand === 'purge' || msgCommand === 'prune') {
		let numberMsg = parseInt(msgArg[0], 10);
		if (isNaN(numberMsg)) return console.log('Invalid Integer?'.red);

		massFetchMessages(message.channel).then(messages => {
			let msg_array = messages.filter(m => m.author.id === bot.user.id).slice(0, numberMsg),
				totalMsg = msg_array.length,
				delMsg = '';

			if (totalMsg <= 0) return console.log('No message to delete.'.red);

			if (message.channel.type === 'dm') {
				delMsg = `${message.channel.recipient.username}#${message.channel.recipient.discriminator}`;
			} else if (message.channel.type === 'group') {
				delMsg = `a Group`;
			} else {
				delMsg = `${message.channel.guild.name} -> ${message.channel.name}`;
			}

			console.log(`Deleting %s messages in %s.`.cyan, totalMsg.toString().bold, delMsg.bold);

			msg_array.filter(m => !m.system).map(m => m.delete()
				.then(() => console.log(`Deleted %s in %s.`.cyan, m.content.bold, delMsg.bold))
				.catch(() => console.log(`Could not delete %s in %s.`.red, m.content.bold, delMsg.bold)));
		}).catch(() => console.log(`Could not load messages.`.red));
	}

	/**
	 * Purge messages from all pm sent
	 */
	if (msgCommand === 'purge_all' || msgCommand === 'prune_all') {
		bot.user.client.users.forEach(member => {
			if (!bot.users.get(member.id).dmChannel) return;

			massFetchMessages(bot.users.get(member.id).dmChannel).then(messages => {
				let msg_array = messages.filter(m => m.author.id === bot.user.id),
					totalMsg = msg_array.length,
					delMsg = `${member.username}#${member.discriminator}`;

				if (totalMsg <= 0) return;

				console.log(`Deleting %s messages from %s`.cyan, totalMsg.toString().bold, `${member.username}#${member.discriminator}`.bold);

				msg_array.filter(m => !m.system).map(m => m.delete()
					.then(() => console.log(`Deleted %s in %s.`.cyan, m.content.bold, delMsg.bold))
					.catch(() => console.log(`Could not delete %s in %s.`.red, m.content.bold, delMsg.bold)));
			}).catch(() => console.log(`Could not load messages from %s`.red, `${member.username}#${member.discriminator}`.bold));
		});

	}

	/**
	 * Send the number of message you wrote on the channel
	 */
	if (msgCommand === 'cm' || msgCommand === 'count_messages') {
		message.delete();

		massFetchMessages(message.channel).then(messages => {
			let msg_array = messages.filter(m => m.author.id === bot.user.id),
				totalMsg = msg_array.length;

			message.channel.send(`I wrote ${totalMsg} messages in this channel.`).catch(() => console.log(`Could not send the message.`.red));
		}).catch(() => console.log(`Could not load messages.`.red));
	}

	/**
	 * Spam messages
	 * <Number Of Messages> <Messages>
	 */
	if (msgCommand === 'sp' || msgCommand === 'spam') {
		message.delete();

		for (let i = 0, iN = Number(msgArg[0]); i < iN; ++i) {
			message.channel.send(msgWithoutCommandName.slice(msgArg[0].length)).catch(() => console.log(`Could not send the %s message.`.cyan.bgRed, i.toString().bold));

			if (i >= iN - 1) {
				console.log('Successfully sent %s messages.'.cyan, iN.toString().bold);
			}
		}
	}

	/**
	 * Logger Fucker by Edition
	 * <Repetition> <Message>
	 */
	if (msgCommand === 'lfe') {
		for (let i = 0; i < Number(msgArg[0]); ++i) {
			let longNl = '\n'.repeat(Math.floor(Math.random() * 1500));
			if (i % 2) {
				message.edit(msgArg[1]);
			}
			message.edit(msgArg[1] + longNl + msgArg[1]);
		}

		// Edit back to original
		message.delete();
	}

	/**
	 * Logger Fucker by Deletion
	 * <Number of Deletion> <Message>
	 */
	if (msgCommand === 'lfd') {
		message.delete();

		for (let i = 0; i < Number(msgArg[0]); ++i) {
			message.channel.send(msgArg[1]).then(msg => msg.delete());
		}

		// Edit back to original
		message.edit(msgArg[1]);
	}

	if (message.channel.type === 'dm') {
		//DM
	}
});

/**
 * Bypass the discord limit of fetching messages from a channel
 * @param channel
 * @param limit
 * @returns {Promise<[]>}
 */
async function massFetchMessages(channel, limit = 1000) {
	const sum_messages = [];
	let last_id;

	while (true) {
		const options = { limit: 100 };
		if (last_id) {
			options.before = last_id;
		}

		const messages = await channel.fetchMessages(options);
		sum_messages.push(...messages.array());
		last_id = messages.last().id;

		if (messages.size !== 100 || sum_messages >= limit) {
			break;
		}
	}

	return sum_messages;
}

/**
 * Register/Encrypt token
 * @returns {Promise<{prefix: *, token: string}>}
 */
async function register() {
	const response = await prompts([
		{
			type: 'text',
			name: 'prefix',
			message: 'Command Prefix:',
		},
		{
			type: 'password',
			name: 'pass',
			message: 'Encryption Password:',
		},
		{
			type: 'password',
			name: 'token',
			message: 'Discord Token:',
		},
	]);

	return { prefix: response.prefix, token: CryptoJS.AES.encrypt(response.token, response.pass).toString() };
}

/**
 * Login/Decrypt token
 * @returns {Promise<string>}
 */
async function login() {
	const response = await prompts({
		type: 'password',
		name: 'pass',
		message: 'Encryption Password:',
	});

	return CryptoJS.AES.decrypt(config.token, response.pass).toString(CryptoJS.enc.Utf8);
}

