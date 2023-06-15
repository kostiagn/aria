//Shift + Alt + F - autoformat
function ColorGradingTabs(isTest) {
const EPSILON = 1.0e-5;
// /https://learn.javascript.ru/bezier
//https://habr.com/ru/articles/264191/
function calculateSpline(points) {
    let n = points.length - 2;
    if (n < 1) return;

    const bezier = [];

    let next = normalizePoint({ x: points[1].x - points[0].x, y: points[1].y - points[0].y });
    let tgL = { x: 0, y: 0 };
    let tgR = { x: 0, y: 0 };
    let cur;

    for (let i = 0; i < n; i++) {
        const p = points[i];
        const p1 = points[i + 1];
        const p2 = points[i + 2];

        cur = next;
        next = normalizePoint({ x: p2.x - p1.x, y: p2.y - p1.y });


        tgL = tgR;
        tgR = normalizePoint({ x: cur.x + next.x, y: cur.y + next.y });

        let l1 = 0.0;
        let l2 = 0.0;


        let dx = (p1.x - p.x) / 2;

        if (dx > 50) dx = 50;
        l1 = tgL.x > 0 ? dx / tgL.x : 1.0;
        l2 = tgR.x > 0 ? dx / tgR.x : 1.0;


        if (tgL.x > 0 && tgR.x > 0) {
            const tmp = tgL.y / tgL.x - tgR.y / tgR.x;
            if (Math.abs(tmp) > EPSILON) {
                x = (p1.y - tgR.y / tgR.x * p1.x - p.y + tgL.y / tgL.x * p.x) / tmp;
                if (x > p.x && x < p1.x) {
                    if (tgL.y > 0.0) { if (l1 > l2) l1 = 0.0; else l2 = 0.0; }
                    else { if (l1 < l2) l1 = 0.0; else l2 = 0.0; }
                }
            }
        }
        bezier.push(p, { x: p.x + tgL.x * l1, y: p.y + tgL.y * l1 }, { x: p1.x - tgR.x * l2, y: p1.y - tgR.y * l2 });

    }
    const l = tgL.x > 0 ? (points[n + 1].x - points[n].x) / (2.0 * tgL.x) : 1.0;

    const p = points[n]
    bezier.push(p, { x: p.x + tgR.x * l, y: p.y + tgR.y * l }, points[n + 1], points[n + 1]);

    return bezier;
}

function normalizePoint(point) {
    const l = Math.sqrt(point.x * point.x + point.y * point.y);
    if (l < EPSILON) return { x: 0, y: 0 }
    const r = { x: point.x / l, y: point.y / l }
    if (Math.abs(r.x) < EPSILON) r.x = 0;
    if (Math.abs(r.y) < EPSILON) r.y = 0;
    return r;
}

const delay = async (delayInms) => {
    return new Promise(resolve => setTimeout(resolve, delayInms));
  }



const tabs = [

];

function registerTab(parentTabTitle, obj) {
    let tab = tabs.find(i => i.title === parentTabTitle);
    if (!tab) {
        tab = { title: parentTabTitle };
        tabs.push(tab);
    }

    if (!obj || !obj.tabTitle) return;
    if (!tab.tabs) tab.tabs = [];
    let subtab = tab.tabs.find(i => i.title === obj.tabTitle);
    if (!subtab) {
        subtab = { title: obj.tabTitle };
        tab.tabs.push(subtab);
    }
    subtab.obj = obj;
}

registerTab("Color Wheels", { tabTitle: "RgbHsv" });
registerTab("Color Wheels", { tabTitle: "Bars" });
registerTab("Curves");
registerTab("Parads");
registerTab("Color Bars");

$(() => {
    let selectedTab;
    const tabsPanel = $("#tabs-panel")
    const firstTabRow = $('<div class="tab-panel"></div>')
    tabsPanel.append(firstTabRow);
    tabs.forEach((item, index) => {

        const el = $(`<div class="tab-element">${item.title}</div>`);
        el.appendTo(firstTabRow);
        tabs[index].el = el;
        el.mousedown(() => selectTab(index));
        if (item.tabs) {
            const secondTabRow = $('<div class="tab-panel hide"></div>');
            tabsPanel.append(secondTabRow);
            item.tabs.forEach((i2, idx2) => {
                const el2 = $(`<div class="tab-element">${i2.title}</div>`);
                el2.appendTo(secondTabRow);
                el2.mousedown(() => selectTab(index, idx2));
                tabs[index].tabs[idx2].el = el2;
            })
        }
    });
    selectTab(1, 1);

    function selectTab(tab1, tab2) {
        if (selectedTab && selectedTab.obj && selectedTab.obj.deactivate) selectedTab.obj.deactivate();
        tabsPanel.find(".active").removeClass('active');
        tabs[tab1].el.addClass("active");
        selectedTab = tabs[tab1];
        tab2 = tab2 || 0;
        tabsPanel.find(".tab-panel").slice(1).addClass("hide");
        if (!tabs[tab1].tabs) return;
        const subTab = tabs[tab1].tabs[tab2];
        if (subTab) {
            subTab.el.addClass("active");
            subTab.el.parent().removeClass("hide");
            selectedTab = subTab;
            if (subTab.obj && subTab.obj.activate) {
                subTab.obj.activate();
            }
        };
    }




});

function removeAllListeners(el) {
    const clone = el.cloneNode(true);
    el.parentNode.replaceChild(clone, el);
    return clone;
}

function bindAll(obj) {
    for (let prop in obj) {
        if (typeof obj[prop] === 'function') {
            obj[prop] = obj[prop].bind(obj);
        }
    }
}
 
function removeAllAndAddListener(querySelector, eventName, listener) {
    const el = removeAllListeners(document.querySelector(querySelector));
    el.addEventListener(eventName,listener);
}


const colorGrading = {
    valueX: 0,
    valueY: 0,
    rectCenterHeight: 5,
    EPSILON: 10e-5,
    createImage: function (width, height) {
        if (this.width === width && this.height === height && this.imageUrl) {
            return this.imageUrl
        }

        this.buffer = new Uint8ClampedArray(width * height * 4);
        this.buffPos = 0;
        this.width = width;
        this.height = height;

        this.creatingImage();

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        const idata = ctx.createImageData(width, height);
        idata.data.set(this.buffer);
        ctx.putImageData(idata, 0, 0);
        this.imageUrl = canvas.toDataURL();
        return this.imageUrl;
    },
    creatingImage: function () {

    },
    addNextPointHsv: function (hue, saturation, luma) {
        const rgb = colorsys.hsv2Rgb(hue, saturation, luma);
        this.buffer[this.buffPos++] = rgb.r;
        this.buffer[this.buffPos++] = rgb.g;
        this.buffer[this.buffPos++] = rgb.b;
        this.buffer[this.buffPos++] = 255;
    },
    activate: function () {
        if (!this.sub2rColorGrading) throw `not set the field sub2rColorGrading for the tab '${this.title}'`;

        const curveMargin = 6;
        const curveEl = $('#curves');
        this.curveEl = curveEl;
        curveEl.removeClass('hide')
        const parent = curveEl.parent();

        const curveHeight = Math.floor(parent.height()) - curveMargin * 2;
        const curveWidth = curveHeight * 3.2;
        curveEl.width(curveWidth + curveMargin * 2);
        curveEl.height(parent.height());

        curveEl.attr("viewBox", `-${curveMargin} -${curveMargin} ${curveEl.width()} ${curveEl.height()}`)
        const net = curveEl.find('[data-type="net"]');

        net.attr('height', curveHeight);
        net.attr('width', curveWidth);
        // circleShift = $('#p-template circle').attr('cx');
        // pointShift = netMargin - circleShift;
        const imageUrl = this.createImage(curveWidth, curveHeight);
        $(curveEl).find('[data-type="background"]').attr("href", imageUrl);
        let values = [];
        
        const devValueEl = document.getElementById("dev-value");
        
        

        this.loadValues(this.sub2rColorGrading).then(vals => {
            
            values = [...vals];
            let curve = Curve({
                canvasEl: curveEl[0], 
                title: this.tabTitle, 
                width: curveWidth, 
                height: curveHeight,
                values: [...vals],
                topVal: this.topVal,
                bottomVal: this.bottomVal,
                areMissedSlidersVisible: document.querySelector('#show-missed-sliders').checked,
                onValuesChanged: (vals) => {
                    if (!vals.some((v,i) => Math.abs(values[i] - v) > 0.05)) return;
                    values = [...vals];
                    this.uploadValues(values);
                },
                onMouseMove: (sliderNum, sliderValue, valueUnderMouse) => {
                    document.getElementById("slider-number").innerHTML = sliderNum;
                    document.getElementById("slider-value").innerHTML = Math.round(sliderNum * 360 / 64);
                    
                    const mn = Math.min(this.topVal, this.bottomVal);
                    const mx = Math.max(this.topVal, this.bottomVal);
                    const r = mx > 100 ? 10 : 100;
                    
                    let v = !this.convertValueToDev ? sliderValue : this.convertValueToDev(sliderValue);
                    v = v < mn ? mn : v > mx ? mx : v;
                    document.getElementById("dev-value").value = Math.round(v * r) / r;

                    v = !this.convertValueToDev ? valueUnderMouse : this.convertValueToDev(valueUnderMouse);
                    v = v < mn ? mn : v > mx ? mx : v;
                    document.getElementById("dev-under-mouse-value").innerHTML = Math.round(v * r) / r;

                }
            });

            removeAllAndAddListener('#reload-values', 'click', async () => {
                values = await this.loadValues(this.sub2rColorGrading);
                curve.changeValues([...values]);
            })

            removeAllAndAddListener('#convert-to-curve', 'click', () => {
                curve.convertToCurve();
            });

            removeAllAndAddListener('#convert-to-sliders', 'click', () => {
                curve.convertToSliders();
            })

            removeAllAndAddListener('#neutral-color-grading', 'click', () => {
                let vals = [];
                const n = Math.abs(this.bottomVal + this.topVal)/2;
                for (let i = 0; i < 64; i++) {
                    vals[i] = n;//i / 64 * 360 - 180; 
                }
                values = [...vals];
                this.uploadValues(vals);
                curve.changeValues(vals);
            })

            removeAllAndAddListener('#default-color-grading', 'click', () => {
                let vals = !this.convertValueFromDev ? [...this.sliderDefault] : this.sliderDefault.map((v) => this.convertValueFromDev(v));
                values = [...vals];
                this.uploadValues(vals);
                curve.changeValues(vals);
            })

            removeAllAndAddListener('#show-missed-sliders', 'click', () => {
                curve.showMissedSliders(document.querySelector('#show-missed-sliders').checked);
            })

            

            dev-under-mouse-value
            // vals = vals.map((v) => this.convertValueToDev(v));
                    // vals.map((v) => this.convertValueFromDev(v));
                    // curve.changeValues([...vals]);
        })
        
    },
    
    loadValues: async function () {
        const values = await sub2r.bulkReadColorGrading(this.sub2rColorGrading);
        return !this.convertValueFromDev ? values : values.map((v) => this.convertValueFromDev(v));
    },

    uploadValues: function (vals) {
        if (this.uploadValuesInProgress) {
            this.nextUploadValues = vals;
            return;
        }
        this.uploadValuesInProgress = true;
        vals = !this.convertValueToDev ? vals : vals.map((v) => this.convertValueToDev(v));
        
        sub2r.bulkWriteColorGrading(this.sub2rColorGrading, vals).then(() => {
            setTimeout(() => {
                this.uploadValuesInProgress = false;
                
                if (this.nextUploadValues) {
                    const nv = this.nextUploadValues;
                    this.nextUploadValues = null;
                    this.uploadValues(nv);
                }
            }, 200);
        });
    },
    

    deactivate: function () {
        this.curveEl.addClass('hide');
    }
}
const colorGradingHvH = {
    __proto__: colorGrading,

    title: "Hue vs. Hue",
    tabTitle: "HvH",
    sub2rColorGrading: 'hueVhue',
    valueY: 3600,
    neutralY: 3600 / 2,
    slidingScaleFactor: 2.7,
    topVal: -180,
    bottomVal: 180,
    sliderDefault: [
        -3.50, -4.90, +0.00, +0.00, +0.00, +4.00, +1.90, +0.00  // 0..7
      , +0.00, +0.00, +0.00, +0.00, +0.00, +0.00, +0.00, +0.00  // 8..15
      , +0.00, +0.00, +0.00, +0.00, -0.50, -5.30, -11.1, -16.7  // 16..23
      , -5.70, -5.60, -11.1, -16.9, -20.4, -18.7, -17.9, -4.30  // 24..31
      , +0.00, +0.00, +0.00, +0.00, -0.70, -1.70, -2.30, -2.80  // 32..39
      , -3.60, -6.70, -16.8, -1.10, +0.00, +0.00, +0.00, +0.00  // 40..47
      , +0.00, +0.00, +0.00, +0.00, +0.00, +0.00, +0.00, +0.00  // 48..55
      , +0.00, +0.00, +0.00, +0.00, +0.00, +0.00, -0.90, -5.60  // 56..63
    ],

    convertValueFromDev: function(v) {
        const tmp = 180 * Math.pow(Math.abs(v/180), 1/this.slidingScaleFactor);
        return v < 0 ? -tmp : tmp;
    },

    convertValueToDev: function (v) {
        const tmp = 180 * Math.pow(Math.abs(v/180), this.slidingScaleFactor);
        return v < 0 ? -tmp : tmp;
    },

    creatingImage: function () {
        const halfHeight = this.height / 2;
        const mx = 360 / this.width; 
        const my = 360 / this.height; 

        for (let y = 0; y < this.height; ++y) {
            const distance = Math.abs(y - halfHeight);
            const center = distance <= this.rectCenterHeight;
            const luma = center ? 200 : 90 + 80 * distance / halfHeight;
            const dhue = center ? 0 : this.convertValueToDev(y * my - 180);
            for (let x = 0; x < this.width; ++x) {
                const hue = (x * mx);
                this.addNextPointHsv( hue + dhue, 255, luma);
            }

        }
    }
}


const colorGradingHvL = {
    __proto__: colorGrading,
    tabTitle: "HvL",
    title: "Hue vs. Luma",
    valueX: 0,
    valueY: 2048,
    valToDev: function (val) {
        return val * 4;
    },
    creatingImage: function () {
        const halfHeight = this.height / 2;
        for (let y = 0; y < this.height; ++y) {
            const distance = Math.abs(y - halfHeight);
            const center = distance <= this.rectCenterHeight;
            const saturation = center ? 255 : 127;
            const luma = center ? 192 : (this.height - y) * 255 / this.height;

            for (let x = 0; x < this.width; ++x) {
                const hue = (359 * x / this.width);
                this.addNextPointHsv(hue, saturation, luma);
            }
        }
    }
}



const colorGradingHvS = {
    __proto__: colorGrading,
    tabTitle: "HvS",
    title: "Hue vs. Saturation",
    sub2rColorGrading: 'hueVsat',
    topVal: 3,
    bottomVal: 0,
    sliderDefault: [
          0.65, 0.65, 0.65, 0.65, 1.00, 1.22, 1.41, 1.56  // 0..7
        , 1.71, 2.05, 2.28, 2.78, 2.78, 2.78, 2.78, 2.78  // 8..15
        , 2.78, 2.78, 2.78, 2.78, 2.78, 2.78, 2.78, 2.78  // 16..23
        , 2.78, 2.78, 2.78, 2.78, 2.78, 2.78, 2.32, 1.75  // 24..31
        , 1.61, 1.61, 1.61, 1.61, 1.61, 1.61, 1.61, 1.61  // 32..39
        , 1.61, 1.61, 1.61, 1.61, 1.61, 1.61, 1.61, 1.61  // 40..47
        , 1.61, 1.61, 1.61, 1.61, 2.21, 2.21, 2.21, 2.21  // 48..55
        , 2.17, 2.17, 2.17, 2.21, 1.00, 1.00, 0.65, 0.65  // 56..63
    ],

    // convertValueFromDev: function(v) {
    //     return v * 100;
    // },

    // convertValueToDev: function (v) {
    //     return v / 100;
    // },

    creatingImage: function () {
        const mx = 360 / this.width;
        
        for (let y = 0; y < this.height; ++y) {
            const saturation = (this.height - y) * 255 / this.height;
            for (let x = 0; x < this.width; ++x) {
                const hue = x * mx;
                
                this.addNextPointHsv(hue, saturation, saturation);
            }
        }
    }
}

registerTab("Curves", colorGradingHvH);
registerTab("Curves", colorGradingHvS);
// registerTab("Curves", colorGradingHvL);


















}