
const fs = require('fs');
const https = require('https');

const express = require('express');
const app = express();
app.use(express.static('public'));
const key = fs.readFileSync('./config/cert.key');
const cert = fs.readFileSync('./config/cert.crt');
const options = { key, cert }
const httpsServer = https.createServer(options, app);
const socketIo = require('socket.io');
const mediasoup = require('mediasoup');
const createWorkers = require('./createWorkers');

const config = require('./config/config');
const createWebRtcTransportBothKinds = require('./createWebRtcTransportBothKinds');
const io = socketIo(httpsServer, {
    cors: [`*`],
    rejectUnauthorized: false
});

var workers = null;
var router = null;
const initMediaSoup = async () => {
    workers = await createWorkers();
    //  console.log(workers);
    router = await workers[0].createRouter({ mediaCodecs: config.routerMediaCodecs })
}
initMediaSoup();
    let thisClientProucerTransport = null;
    let thisClientProducer = null;
    let thisClientConsumerTransport = null;
    let thisClientConsumer = null;
io.on('connect', (socket) => {

    console.log('A client connected', socket.id);
    socket.on('getRtpCap', (callback) => {
        callback(router.rtpCapabilities);
    })
    socket.on('create-producer-transport', async (callback) => {
        const {transport, clientTransportParams} = await createWebRtcTransportBothKinds(router);
        console.log('Producer transport created:', clientTransportParams.id);
        thisClientProucerTransport = transport;
        callback(clientTransportParams);

    })
    socket.on('connect-transport', async (dtlsParameters, callback) => {
        try {

            await thisClientProucerTransport.connect(dtlsParameters);
            callback("success");
        } catch (error) {

            console.log("Error connecting transport", error);
            callback("error");
        }
    })
    socket.on('start-producing', async ({ kind, rtpParameters }, callback) => {
        try {
            thisClientProducer = await thisClientProucerTransport.produce({ kind, rtpParameters });
            console.log('Producer created:', thisClientProducer.id);
            callback(thisClientProducer.id);
        } catch (error) {
            console.log("Error starting producer", error);
            callback("error");
        }
    })
    socket.on('create-consumer-transport', async (callback) => {
        const {transport, clientTransportParams} = await createWebRtcTransportBothKinds(router);
        console.log('Consumer transport created:', clientTransportParams.id);
        thisClientConsumerTransport = transport;
        callback(clientTransportParams);

    })
    socket.on('connect-consumer-transport', async (dtlsParameters, callback) => {
        try {

            await thisClientConsumerTransport.connect(dtlsParameters);
            callback("success");
        } catch (error) {

            console.log("Error connecting transport", error);
            callback("error");
        }
    })
    socket.on('consume-media', async({rtpCapabilities}, callback) => {
        if(!thisClientProducer){
            callback("noProducer")
        }
        else if(!router.canConsume({producerId:thisClientProducer.id, rtpCapabilities})){
            callback("cannotConsume")
        }
        else{
            thisClientConsumer = await thisClientConsumerTransport.consume({
                producerId: thisClientProducer.id,
                rtpCapabilities,
                paused: true
            })
            const consumerParams = {
                producerId: thisClientProducer.id,
                id: thisClientConsumer.id,
                kind: thisClientConsumer.kind,
                rtpParameters: thisClientConsumer.rtpParameters
            }
            callback(consumerParams);
        }
    })

    socket.on('unpauseConsumer', async(callback)=>{
        await thisClientConsumer.resume();
    })
})

httpsServer.listen(config.port, "0.0.0.0", ()=>{
    console.log("Server running");
    
})
