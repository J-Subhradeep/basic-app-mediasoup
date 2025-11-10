const createWebRtcTransportBothKinds = (router) => new Promise(async (resolve, reject) => {

    const transport = await router.createWebRtcTransport({

            enableUdp: true,
            enableTcp: true,
            preferUdp: true,
            listenInfos: [
                {
                    ip: '127.0.0.1',
                    protocol: 'udp',
                },
                {
                    ip: '127.0.0.1',
                    protocol: 'tcp',
                }
            ]
        });

       const clientTransportParams = {
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters
        }

        resolve({transport, clientTransportParams})
})

module.exports = createWebRtcTransportBothKinds;