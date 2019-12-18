const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, prettyPrint } = format;

const logger = createLogger({
    format: combine(
        // label({ label: 'right meow!' }),
        timestamp(),
        prettyPrint()
    ),
    transports: [new transports.Console(),
    new transports.File({ filename: 'logs/changes.json.log'})]
});

function log (consoleLogger, label, msg) {
    consoleLogger(msg);
    logger.log({
        level: 'info',
        message: msg,
        label: label,
    });
}




module.exports = log;