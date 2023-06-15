const sub2r = {
    debugOn: true,
};
window.sub2r = sub2r;
(function () {
    let device;
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
        if (device) return device;
        device = await navigator.usb.requestDevice({ filters: [{ vendorId: 0x04B4, productId: 0x0036 }] });
        window.device = device;
        console.log(device);
        await device.open();

        await device.selectConfiguration(1);
        sub2r.device = device;
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
        debug("receive data", res, len && res.status === 'ok' ? toHex(res.data.getUint8()) : '');
        return res;
    }

    async function controlTransferOut(packet, buff) {
        debug(`send packetOut ${toHex(packet.request, 2)} ${toHex(packet.index, 2)} ${toHex(packet.value, 2)} `, packet);
        const res = await device.controlTransferOut(packet, buff);
        debug("receive data", res);
        return res;
    }


    function getBandPacket({ band, name, idxName, value }) {
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
        const packet = getBandPacket({ band, name });
        const res = await controlTransferIn(packet, 1);
        let val = res.data.getUint8();
        debug(`receiveBandValue: band ${band}, name ${name}, value ${val} (${toHex(val, 2)})`);
        if (cmd.idx2) {
            const packet2 = getBandPacket({ band, name, idxName: 'idx2' });
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
            const packet = getBandPacket({ band, name, value });
            const res = await controlTransferOut(packet);
            debug(`sendBandValue: res ${res}`);
        } else {
            if (cmd.convertOut) {
                value = cmd.convertOut(value);
            }
            const val2 = value >> 8;
            const val1 = value & 0xFF;
            const packet = getBandPacket({ band, name, value: val1 });
            const res = await controlTransferOut(packet);
            debug(`sendBandValue: packet 1 res ${res}`);
            const packet2 = getBandPacket({ band, name, value: val2, idxName: 'idx2' });
            const res2 = await controlTransferOut(packet2);
            debug(`sendBandValue: packet 2 res ${res}`);
        }
    }


    function convertInHueVHue(v) {
        return v / 0x4000 * 360;
    }

    function convertOutHueVHue(v) {
        v = v < -180 ? -180 : v > 180 ? 180 : v;
        return Math.round(v * 0x4000 / 360);
    }
    function convertInHueVSat(v) {
        return v / 256;
    }

    function convertOutHueVSat(v) {
        return Math.floor(v * 256);
    }

    const convertColorGradingIn = (v, fun) => {
        const arr = Array.from(new Int16Array(v.buffer));
        debug(`convertColorGradingIn: fun '${fun.name}' recieve array [${arr}]`);
        const res = arr.map(fun);
        debug(`convertColorGradingIn: fun '${fun.name}' converted array: [${res}]`);
        return res;
    }

    const convertColorGradingOut = (v, fun) => {
        const arr = new Int16Array(64);
        for (let i = 0; i < 64; i++) {
            arr[i] = fun(v[i]);
        }
        return arr;
    }

    sub2r.colorGrading = {
        hueVhue: { table: 0, convertIn: convertInHueVHue, convertOut: convertOutHueVHue },
        hueVsat: { table: 1, convertIn: convertInHueVSat, convertOut: convertOutHueVSat },
        lumaVsat: 2,
        satVsat: 3,
        lumaVluma: 4,
        hueVluma: 5,
    }
    sub2r.bulkReadColorGrading = async (cmd) => {
        cmd = typeof cmd === 'string' ? sub2r.colorGrading[cmd] : cmd;
        const packet = {
            requestType: 'vendor',
            recipient: 'device',
            request: 0xB1,
            value: 0x140, //version 1, count 0x40 = 64
            index: cmd.table << 8,
        }
        const res = await controlTransferIn(packet, 128);

        if (res.status !== 'ok') throw 'an error occurred while running bulkReadColorGrading. table = ' + cmd.table;
        if (!cmd.convertIn) throw 'there is no convertIn function. table = ' + cmd.table;
        return convertColorGradingIn(res.data, cmd.convertIn);
    }

    sub2r.bulkWriteColorGrading = async (cmd, arr) => {
        cmd = typeof cmd === 'string' ? sub2r.colorGrading[cmd] : cmd;
        const packet = {
            requestType: 'vendor',
            recipient: 'device',
            request: 0xB1,
            value: 0x140, //version 1, count 0x40 = 64
            index: cmd.table << 8,
        }
        if (!cmd.convertOut) throw 'there is no convertOut function. table = ' + cmd.table;

        const data = convertColorGradingOut(arr, cmd.convertOut);

        let res = await controlTransferOut(packet, data);
        if (res.status !== 'ok') throw 'an error occurred while running bulkReadColorGrading. table = ' + cmd.table;
    }





    function convertInBinning(v) {
        switch (v & 0xFF) {
            case 0x00: return 0;
            case 0x01: return 1;
            case 0x10: return 2;
            case 0x11: return 3;
        }
    }
    function convertOutBinning(v) {
        switch (v) {
            case 0: return 0x1100;
            case 1: return 0x1101;
            case 2: return 0x1110;
            case 3: return 0x1111;
        }
    }
    function convertSensorIn(v1, v2) {
        return ((v1 & 0xFF) << 8) + (v2 & 0xFF);
    }
    function convertSensorOut(v) {
        return {
            v1: 0xFF + (v >> 8),
            v2: 0xFF + (v & 0xFF)
        }
    }

    const sensorsCommand = {
        binning: { idx: 0x3663, convertIn: convertInBinning, convertOut: convertOutBinning },
        rgbEnabled: { idx: 0x5001, convertIn: (v) => (v & 0x02) > 0, convertOut: (v) => v ? 0x02ff : 0x0200, },
        red: { idx: 0x5056, len: 2 },
        green: { idx: 0x5058, len: 2 },
        blue: { idx: 0x505A, len: 2 },
        gain: { idx: 0x350A, len: 2 },
        exposure: { idx: 0x3500, len: 3 },
        black: { idx: 0x4004, len: 2 },
    }

    sub2r.bulkReadSensors = async () => {
        const packet = {
            requestType: 'vendor',
            recipient: 'device',
            request: 0xA5,
            value: 0,
            index: 0,
        }

        const res = {};
        for (let name in sensorsCommand) {
            const cmd = sensorsCommand[name];
            debug(`bulkReadSensors: read value ${name}`);
            if (cmd.len && cmd.len > 0) {
                let v = 0;
                for (let i = 0; i < cmd.len; i++) {
                    packet.index = cmd.idx + i;
                    let ans = await controlTransferIn(packet, 2);
                    if (ans.status !== 'ok') throw 'an error occurred while running bulkReadSensors. value = ' + name + " idx = " + packet.index;
                    v = (v << 8) + ans.data.getUint8();
                }
                res[name] = v;
            } else {
                packet.index = cmd.idx;
                let ans = await controlTransferIn(packet, 2);
                if (ans.status !== 'ok') throw 'an error occurred while running bulkReadSensors. value = ' + name;
                let v = ans.data.getUint8();
                if (cmd.convertIn) v = cmd.convertIn(v);
                res[name] = v;
            }
        }

        debug('bulkReadSensors: recieve values ', res)
        return res;
    }

    sub2r.writeSensor = async (name, value) => {
        const packet = {
            requestType: 'vendor',
            recipient: 'device',
            request: 0xA5,
            value: 0,
            index: 0,
        }

        if (!sensorsCommand[name]) throw `writeSensor: not found command for '${name}'`

        const cmd = sensorsCommand[name];
        debug(`writeSensor: write value for ${name}`, value);
        const ln = cmd.len || 1;
        for (let i = 0; i < ln; i++) {
            packet.index = cmd.idx + i;
            let v = typeof value === 'number' ? 0xFF & (value >> (8 * (cmd.len - i - 1))) : value;
            packet.value = cmd.convertOut ? cmd.convertOut(v) : 0xFF00 + v;
            let ans = await controlTransferOut(packet);
            if (ans.status !== 'ok') throw 'an error occurred while running writeSensor. name = ' + name + " idx = " + packet.index;
        }
    }


})();