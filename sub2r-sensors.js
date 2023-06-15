function Sub2rSensors(model) {
    const container = model.container;
    let sensors = {};

    const conf = {
        "slider-red": { max: 4095 },
        "slider-green": { max: 4095 },
        "slider-blue": { max: 4095 },
        "slider-gain": { max: 1023 },
        "slider-exposure": {
            max: 9000,
            ranges: [{ min: 0, max: 9000 }, { min: 6000, max: 18000 }, { min: 14000, max: 35000 }, { min: 30000, max: 65536 }]
        },
        "slider-black": { max: 1023 },

    }

    const binningType = container.querySelector('#binning-type');
    const rgbButton = container.querySelector('#rgb-on-off');
    const gainButton = container.querySelector('#gain-on-off');
    const exposureButton = container.querySelector('#exposure-on-off');
    const sliderRed = container.querySelector("#slider-red");
    const editRed = container.querySelector("#edit-red");
    const sliderGreen = container.querySelector("#slider-green");
    const editGreen = container.querySelector("#edit-green");
    const sliderBlue = container.querySelector("#slider-blue");
    const editBlue = container.querySelector("#edit-blue");
    const sliderExposure = container.querySelector("#slider-exposure");
    const editExposure = container.querySelector("#edit-exposure");
    const exposureSelectRange = container.querySelector('#exposure-range');
    const sliderGain = container.querySelector("#slider-gain");
    const editGain = container.querySelector("#edit-gain");

    const sliders = {};
    const edits = {};


    linkSliderToEdit();
    confOnOffButtons();
    confExposureRange();
    confBinningType();


    function linkSliderToEdit() {
        container.querySelectorAll("input[type=range]").forEach(slider => {
            const name = slider.id.split('-')[1];
            const editId = 'edit-' + name;
            const edit = container.querySelector("#" + editId);
            sliders[name] = slider;
            edits[name] = edit;
            slider.min = 0;
            slider.max = conf[slider.id].max;
            slider.value = 0;
            edit.min = 0;
            edit.value = 0;
            edit.max = conf[slider.id].max;

            edit.addEventListener('input', () => {
                slider.value = edit.value;
                onChangeValue(name, Number.parseInt(edit.value) || 0);

            })
            slider.addEventListener('input', () => {
                edit.value = slider.value;
                onChangeValue(name, Number.parseInt(edit.value) || 0);
            })
        });
    }

    function setOnOff(el, enabled) {
        el.classList.remove(enabled ? 'off' : 'on');
        el.classList.add(enabled ? 'on' : 'off');
    }
    function togleOnOff(el) {
        const enabled = !el.classList.contains("on");
        setOnOff(el, enabled);
        return enabled;
    }
    function setRgbButtonOnOff(enabled) {
        setOnOff(rgbButton, enabled);
        sliderRed.disabled = !enabled;
        sliderGreen.disabled = !enabled;
        sliderBlue.disabled = !enabled;
        editRed.disabled = !enabled;
        editGreen.disabled = !enabled;
        editBlue.disabled = !enabled;
    }
    function setGainButtonOnOff(enabled) {
        setOnOff(gainButton, enabled);
        sliderGain.disabled = !enabled;
        editGain.disabled = !enabled;
    }
    function setExposureButtonOnOff(enabled) {
        setOnOff(exposureButton, enabled);
        sliderExposure.disabled = !enabled;
        editExposure.disabled = !enabled;
        exposureSelectRange.disabled = !enabled;
    }
    function confOnOffButtons() {
        setOnOff(rgbButton, true);
        setOnOff(gainButton, true);
        setOnOff(exposureButton, true);

        rgbButton.addEventListener('click', () => {
            const enabled = togleOnOff(rgbButton);
            setRgbButtonOnOff(enabled);
            onChangeValue('rgbEnabled', enabled);
        })
        gainButton.addEventListener('click', () => {
            setGainButtonOnOff(togleOnOff(gainButton));

        })
        exposureButton.addEventListener('click', () => {
            setExposureButtonOnOff(togleOnOff(exposureButton));
        })
    }

    function exposureChangeRange({ min, max }) {
        const value = sliderExposure.value < min ? min : sliderExposure.value > max ? max : sliderExposure.value;
        sliderExposure.max = max;
        sliderExposure.min = min;
        sliderExposure.value = value;
        editExposure.max = max;
        editExposure.min = min;
        editExposure.value = value;
        onChangeValue('exposure', Number.parseInt(value) || 0);
    }

    function confExposureRange() {
        const ranges = conf["slider-exposure"].ranges;

        exposureSelectRange.addEventListener('change', () => {
            exposureChangeRange(ranges[exposureSelectRange.selectedIndex]);
        })
    }

    function confBinningType() {
        binningType.addEventListener('change', () => {
            onChangeValue('binning', binningType.selectedIndex);
        });
    }

    function onChangeValue(name, value) {
        if (sensors[name] !== value) {
            sensors[name] = value;
            if (model.onChangeValue) {
                model.onChangeValue(name, value);
            }
        }
    }

    function changeValues(newSensors) {
        sensors = newSensors;
        setRgbButtonOnOff(sensors.rgbEnabled);
        //gainButton
        //exposureButton
        binningType.selectedIndex = sensors.binning;
        const expIdx = conf["slider-exposure"].ranges.findIndex(r => r.min <= sensors.exposure && r.max >= sensors.exposure)
        exposureSelectRange.selectedIndex = expIdx;
        for (let name in sensors) {
            if (sliders[name]) {
                sliders[name].value = sensors[name];
            }
            if (edits[name]) {
                edits[name].value = sensors[name];
            }
        }


    }

    return {
        changeValues,
    }


}