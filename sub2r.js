const sub2r = {
    debugOn: true,
};
window.sub2r = sub2r;
(function () {
    const formatVersion = (data) => {
        const b = new Uint8Array(data.buffer);
        return `${b[0]}.${b[1]}.${b[2]}.${b[3]}`
    }

    const getUint8 = (d) => d.getUint8();
    const getBit = (d, cmd) => d.getUint8() && cmd.bit !== 0;

    const command = {
        fx3Version: { request: 0xAB, len: 4, ret: formatVersion, },
        fpgaVersion: { request: 0xAC, len: 4, ret: formatVersion, },

        ledRed: { request: 0xA4, len: 1, idx: 0x08, ret: getUint8 },
        ledGreen: { request: 0xA4, len: 1, idx: 0x0A, ret: getUint8 },
        ledBlue: { request: 0xA4, len: 1, idx: 0x0C, ret: getUint8 },

        fan: { request: 0xA4, len: 1, idx: 0x06, bit: 0x40, ret: getBit },

    }

    sub2r.openCamera = async () => {
        //VID_04B4&PID_0036
        const device = await navigator.usb.requestDevice({ filters: [{ vendorId: 0x04B4, productId: 0x0036 }] });

        console.log(device);
        await device.open();

        await device.selectConfiguration(1);
        return device;
    }

    // async function sendInReqeust(command, cfg) {
    //     cfg = cfg || {};
    //     try {

    //         let res = await device.controlTransferIn({
    //             requestType: 'vendor',
    //             recipient: 'device',
    //             request: command.request,
    //             value: command.value || 0,
    //             index: command.idx || 0,
    //         }, command.len || 0);

    //         if (cfg.returnResult) return res;
    //         if (command.ret) {
    //             return command.ret(res.data, command);
    //         }
    //     } catch (e) {
    //         console.log(e)
    //     }

    // }

    // async function sendOutReqeust(command, val) {
    //     try {

    //         let res = await device.controlTransferOut({
    //             requestType: 'vendor',
    //             recipient: 'device',
    //             request: command.request,
    //             value: val || 0,
    //             index: command.idx || 0,
    //         });


    //     } catch (e) {
    //         console.log(e)
    //     }

    // }


    function debug(...args) {
        if (sub2r.debugOn) {
            console.log(...args);
        }
    }
    function toHex(num, ln) {
        let r = num.toString(16);
        while (r.length < ln) r = '0' + r;
        return '0x' + r;
    }

    function checkIsBoolean(b, name) {
        if (enabled !== true && enabled !== false && enabled !== 0 && enabled !== 1) {
            throw (`the variable '${name}' must be boolean. instead its value is (${b}).`)
        }
    }
    function checkBand(band) {
        if (band !== 0 && band !== 1 && band !== 2 && band !== 3) throw (`the variable 'band' must be 0,1,2 or 3. but it's (${band})`);
    }
    async function controlTransferIn(packet, len) {
        debug(`send packet ${toHex(packet.request, 2)} ${toHex(packet.index, 2)}`, packet, "len", len);
        const res = await device.controlTransferIn(packet, len);
        debug("receive data", res);
        return res;
    }

    async function controlTransferOut(packet) {
        debug(`send packetOut ${toHex(packet.request, 2)} ${toHex(packet.index, 2)} ${toHex(packet.value, 2)} `, packet);
        const res = await device.controlTransferOut(packet);
        debug("receive data", res);
        return res;
    }


    function getBandPacket({band, name, idxName, value}) {
        const cmd = bandCommand[name];
        if (!cmd) throw (`'name' is not band command`);
        const idx = cmd[idxName || 'idx'];
        if (!idx) throw (`not found field '${idx}' in band command '${name}'`);
        return {
            requestType: 'vendor',
            recipient: 'device',
            request: 0xA4,
            value: value || 0,
            index: (idx & 0x0F) + 0x80 + (band << 4),
        }
    }

    const convertInHue = function (v) {
        if (v >= 0x8000) {
            return 360 - Math.round((0x10000 - v) / 0x2000 * 180);
        }
        return Math.round(v / 0x2000 * 180);
    }

    const convertOutHue = function (v) {
        if (v > 180) {
            return 0x10000 - Math.round((360 - v) / 180 * 0x2000);
        }

        return Math.round(v / 180 * 0x2000);
    }

    const convertInTolerance = function (v) {
        return Math.round(v / 0x2000 * 180);
    }

    const convertOutTolerance = function (v) {
        return Math.round(v / 180 * 0x2000);
    }

    const bandCommand = {

        enabled: { idx: 0x80 },
        saturationMin: { idx: 0x82 },
        saturationMax: { idx: 0x83 },
        lumaMin: { idx: 0x84 },
        lumaMax: { idx: 0x85 },
        hue: { idx: 0x86, idx2: 0x87, convertIn: convertInHue, convertOut: convertOutHue },
        tolerance: { idx: 0x88, idx2: 0x89, convertIn: convertInTolerance, convertOut: convertOutTolerance },
        colorRed: { idx: 0x8A },
        colorGreen: { idx: 0x8C },
        colorBlue: { idx: 0x8D },

    }

    sub2r.receiveBandValue = receiveBandValue = async (band, name) => {
        checkBand(band);
        debug(`receive ${name} for band ${band}`);
        const cmd = bandCommand[name];
        if (!cmd) throw (`'name' is not band command`);
        const packet = getBandPacket({band, name});
        const res = await controlTransferIn(packet, 1);
        let val = res.data.getUint8();
        debug(`receiveBandValue: band ${band}, name ${name}, value ${val} (${toHex(val, 2)})`);
        if (cmd.idx2) {
            const packet2 = getBandPacket({band, name, idxName: 'idx2'});
            const res2 = await controlTransferIn(packet2, 1);
            const val2 = res2.data.getUint8();
            val += 256 * val2;
            debug(`receiveBandValue: band ${band}, name ${name}, value ${val2} (${toHex(val2, 2)}) / ${val} (${toHex(val, 4)})`);
        }
        
        if (cmd.convertIn) {
            val = cmd.convertIn(val);
            debug(`receiveBandValue: convert value band ${band}, name ${name}, value (${val})`);
        }
        return val;

    }


    sub2r.recieveColorSubstitution = async () => {
        debug('receive data for all band');
        const res = [];
        for (let band = 0; band < 4; band++) {
            const obj = {};
            for (let name of Object.keys(bandCommand)) {
                obj[name] = await receiveBandValue(band, name);
            }
            console.log('band ', band, "obj", obj)
            res.push(obj);
        }
        debug("recieveColorSubstitution result", res);
        return res;
    }

    sub2r.sendBandValue = async (band, name, value) => {
        checkBand(band);
        debug(`send ${name} for band ${band}`);
        const cmd = bandCommand[name];
        if (!cmd) throw (`'name' is not band value`);
        if (!cmd.idx2) {
            const packet = getBandPacket({band, name, value});
            const res = await controlTransferOut(packet);
            debug(`sendBandValue: res ${res}`);
        } else {
            if (cmd.convertOut) {
                value = cmd.convertOut(value);
            }
            const val2 = value >> 8;
            const val1 = value & 0xFF;
            const packet = getBandPacket({band, name, value: val1});
            const res = await controlTransferOut(packet);
            debug(`sendBandValue: packet 1 res ${res}`);
            const packet2 = getBandPacket({band, name, value: val2, idxName: 'idx2'});
            const res2 = await controlTransferOut(packet2);
            debug(`sendBandValue: packet 2 res ${res}`);
        }
    }
})();