const process = require("process");
const zmq = require("zeromq");

const DISCOVERY_ADDRESS = "tcp://*:20000";
const MESSAGE_ADDRESS = `tcp://*:30000`;

// We keep track of all peers including our own hostname
const NODES = [];
const args = process.argv.slice(2);
NODES.push(process.env["HOSTNAME"], ...args);

const TOPIC_DISCOVERY = "0";
const TOPIC_MESSAGE = "1";

// We us different sockets for different message types.
// Otherwise, we'll get duplicate messages.
const discoveryPublisher = zmq.socket("pub");
const messagePublisher = zmq.socket("pub");
const subscriber = zmq.socket("sub");

// Send a simple message
function sendMessageUpdate() {
  const message = Buffer.from(`PING! from host ${process.env["HOSTNAME"]}`);
  console.info(`Sending message: "${message}"`);
  messagePublisher.send([TOPIC_MESSAGE, message]);
}

// Send our known peers
function sendDiscoveryUpdate() {
  const message = Buffer.from(NODES.join(","));
  console.info(`Sending discovery update: "${message}"`);
  discoveryPublisher.send([TOPIC_DISCOVERY, message]);
}

// Update our list of known peers and connect to knew ones
// if we get a discovery topic message
function handleDiscoveryTopic(message) {
  console.info(`Discovery update received - ${message}`);
  const messageString = String(message);
  nodes = messageString.split(",");
  nodes.forEach(node => {
    if (NODES.includes(node)) return;
    NODES.push(node);
    subscriber.connect(`tcp://${node}:20000`);
    subscriber.connect(`tcp://${node}:30000`);
  });
}

// Handle simple message topic messages
function handleMessageTopic(message) {
  console.info(`Message received - ${message}`);
}

// Listen for messages on socket and call function related to topic
subscriber.on("message", function(topic, message) {
  const topicString = String(topic);
  switch (topicString) {
    case TOPIC_DISCOVERY:
      handleDiscoveryTopic(message);
      break;
    case TOPIC_MESSAGE:
      handleMessageTopic(message);
      break;
    default:
      console.warn(`Unknown topic '${topic}'. Dropping message.`);
      break;
  }
});

discoveryPublisher.bindSync(DISCOVERY_ADDRESS);
messagePublisher.bindSync(MESSAGE_ADDRESS);

// Connect to our initially known nodes
NODES.forEach(node => {
  subscriber.connect(`tcp://${node}:20000`);
  subscriber.connect(`tcp://${node}:30000`);
});

subscriber.subscribe(TOPIC_MESSAGE);
subscriber.subscribe(TOPIC_DISCOVERY);

console.log(`TCP socket listening, hostname: ${process.env["HOSTNAME"]}`);

// Start sending messages every 2.5s
setInterval(() => {
  console.log("===================");
  sendMessageUpdate();
  sendDiscoveryUpdate();
  console.log("===================");
}, 2500);
