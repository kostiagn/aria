function Curve(model) {
    const canvasEl = model.canvasEl;
    const name = model.name;
    const width = model.width;
    const height = model.height;
    const isTestData = !model.values;
    let values = model.values || [];
    const topVal = model.topVal;
    const bottomVal = model.bottomVal;
    const my = Math.abs(topVal - bottomVal) / height;
    const minVal = Math.min(topVal, bottomVal);

    let points = [];
    const valuesCount = values.length || 64;
    const dx = width / valuesCount;
    let valuesElement;
    const $canvasEl = $(canvasEl);
    const storageName = name + "_curve"

    const pointR = 6;
    let isPointDraging = false;
    let dragingPointIndex;
    let dragingPoint;
    let nextPointId = 0;
    const minDistance = dx * 0.95;
    let stickyMode = true;
    let areMissedSlidersVisible = model.areMissedSlidersVisible;
    let missedSlidersEl;

    const grpPoints = canvasEl.querySelector("#g-points");
    const grpMissedSliders = canvasEl.querySelector("#g-missed-sliders");
    const grpPaths = canvasEl.querySelector("#g-paths");

    const bezierPath = addOrGetBezierPath();

    document.getElementById("calc-bizier-points").addEventListener('click', calcBizierPoints)
    //canvasEl.insertAdjacentHTML('beforeEnd', `<path stroke="black" fill="none" stroke-width="1" d="M0,0 L0,${height} ${width},${height} ${width},0 0,0"/>`);;

    clearCanvas();
    if (isTestData) {
        const storageValue = JSON.parse(localStorage.getItem(storageName)) || {};
        if (!storageValue.points) {
            storageValue.points = points;
            addPoint(0, height / 2);
            addPoint(width, height / 2);
        } else {
            points = storageValue.points;
            points.forEach(p => {
                if (p.y < 0) p.y = 0;
                if (p.y > height) p.y = height;
            });
            points.forEach(p => {
                p.id = "point-" + (++nextPointId);
            })

            drawPoints();
        }
        drawPath();
    } else {
        changeValues();
    }



    function convertToPoint(valNum, val) {
        const y = Math.round((val - minVal) / my * 1000) / 1000;
        return {
            x: Math.round((valNum + 0.5) * dx * 1000) / 1000,
            y: topVal > bottomVal ? height - y : y,
        }
    }

    function convertToSlider(x, y) {
        return {
            num: Math.round(x / dx - 0.5),
            val: convertToValue(y)
        }
    }
    function convertToValue(y) {
        y = topVal > bottomVal ? height - y : y;
        return Math.round(((y * my) + minVal) * 1000) / 1000;
    }

    function changeValues(newValues) {
        if (newValues) values = newValues;
        redrawCanvas();
    }
    
    function redrawCanvas() {
        clearCanvas();
        points = values.map((val, num) => {
            const p = convertToPoint(num, val);
            p.id = "point-" + (++nextPointId);
            return p;
        });
        drawPoints();
        drawPath();
    }


    function canAddOrMovePoint(x, index) {
        return points.findIndex((p, i) => i !== index && p && Math.abs(p.x - x) < minDistance) < 0;
    }

    function findPointIndex(x) {
        const index = points.findIndex(p => p.x > x);
        return index === -1 ? points.length : index;
    }

    function addPoint(x, y) {
        if (stickyMode) {
            const ps = Math.round((x - dx / 2) / dx);
            const nx = ps * dx + dx / 2;
            const nx2 = nx > x ? nx - dx : nx + dx;
            if (canAddOrMovePoint(nx)) x = nx; else x = nx2;
        }
        if (!canAddOrMovePoint(x)) return;
        const index = findPointIndex(x);
        const id = "point-" + (++nextPointId);

        if (x < dx / 2) x = dx / 2;
        if (x > width - dx / 2) x = width - dx / 2;

        const newPoint = { x, y, id };
        points.splice(index, 0, newPoint);

        drawPoint(newPoint);
        onPointsChange();

        return newPoint;
    }

    function drawPoints() {
        points.forEach(p => drawPoint(p));
    }

    function drawPoint(p) {
        grpPoints.insertAdjacentHTML('beforeEnd', `<circle id="${p.id}" class="point" r="${pointR}" cx="${p.x}" cy="${p.y}"/>`);
    }

    function getPoints() {
        return points;
    }

    $canvasEl.unbind();
    canvasEl.oncontextmenu = () => { return false; }

    $canvasEl.mousedown(event => {
        event.stopPropagation();
        event.preventDefault();
        if (event.which === 1) {
            let id = event.target.id;
            if (event.target.nodeName !== 'circle') {
                const { x, y } = getMousePos(event);
                const newPoint = addPoint(x, y);
                if (!newPoint) return false;
                drawPath();
                id = newPoint.id;
            }
            isPointDraging = true;
            dragingPointIndex = getPointIndex(id);
            dragingPoint = document.getElementById(id);
            canvasEl.querySelectorAll("circle").forEach(el => el.classList.remove('active'));
            dragingPoint.classList.add('active');
            // updateValuesByPoint();
        }

        return false;
    });

    $canvasEl.mousemove(event => {
        let { x, y } = getMousePos(event);
        if (model.onMouseMove) {
            const { num, val } = convertToSlider(x, y);
            model.onMouseMove(num, values[num], val);
        }
        if (event.buttons === 0) {
            isPointDraging = false;
        }
        if (!isPointDraging) return;

        const point = points[dragingPointIndex];

        const dx2 = dx / 2;
        if (stickyMode) {
            x = Math.round((x - dx / 2) / dx) * dx + dx / 2;
        }

        if (x < dx2) x = dx2;
        if (y < 0) y = 0;
        if (x > width - dx2) x = width - dx2;
        if (y > height) y = height;
        if (dragingPointIndex === 0) x = dx2;
        else if (dragingPointIndex === points.length - 1) x = width - dx2;
        else {
            if (x < points[dragingPointIndex - 1].x + minDistance) x = points[dragingPointIndex - 1].x + minDistance;
            if (x > points[dragingPointIndex + 1].x - minDistance) x = points[dragingPointIndex + 1].x - minDistance;
        }

        if (x != point.x || y != point.y) {
            movePoint(dragingPoint, point, x, y);
            drawPath();
        }

    })

    $canvasEl.mouseup(event => {
        event.stopPropagation();
        event.preventDefault();

        if (isPointDraging) {
            isPointDraging = false;
            return false;
        }

        const target = event.target;
        const { x, y } = getMousePos(event);
        if (event.target.nodeName == 'circle' && event.which === 3) {
            const index = getPointIndex(event.target.id);
            if (index > 0 && index < points.length - 1) {
                target.remove();
                points.splice(index, 1);
                drawPath();
            }
        }
        return false;
    })

    function getPointIndex(id) {
        return points.findIndex((p, i) => p.id === id);
    }


    function getMousePos(evt) {
        const pos = evt.currentTarget.getBoundingClientRect();
        return {
            x: evt.clientX - pos.left - pointR,
            y: evt.clientY - pos.top - pointR
        };
    };

    function movePoint(el, point, newX, newY) {
        point.x = newX;
        point.y = newY;
        el.setAttribute('cx', newX);
        el.setAttribute('cy', newY);
        onPointsChange();
    }

    function drawPath() {

        if (points.length === 2) {
            bezierPath.setAttribute('d', `M${points[0].x},${points[0].y} L${points[1].x},${points[1].y}`);
            return;
        }

        let bezierPoints = spline(points);
        bezierPath.setAttribute('d', bezierPointsToPath(bezierPoints));
        let l = `M${points[0].x},${points[0].y}`;
        for (let i = 1; i < points.length; i++) {
            l += ` L${points[i].x},${points[i].y}`;
        }
        document.getElementById('linear-path').setAttribute('d', l);
        const sliders = calcAllPointsByBezierPath(bezierPoints);
        drawMissedSliders(sliders);

        values = sliders.map(v => convertToValue(v));
        if (model.onValuesChanged) {
            model.onValuesChanged(values);
        }
        

    }

    function drawMissedSliders(sliders) {
        if (!areMissedSlidersVisible) return;
        const d = 2 * pointR;
        const h = Math.round(d/3 * 10) / 10;
        const dy = Math.round((d - h) /2 * 10) / 10;

        if (!missedSlidersEl) {
            missedSlidersEl = [];
            for (let i =0; i< valuesCount -2;i++) {
                 grpMissedSliders.insertAdjacentHTML('beforeEnd', 
                    `<rect y="0" width="${d}" rx="4" height="${h}" class="missed-slider hide"/>`);
                missedSlidersEl[i] = grpMissedSliders.lastChild;
            }
        }
        
        let sliderNum = 0;
        for (let i = 0, x = dx/2; i < sliders.length; i++, x+=dx) {
            const y = sliders[i];
            const collide = points.some(p => Math.abs(p.x - x) <= d && Math.abs(p.y - y) <= d);
            if (!collide) {
                const el = missedSlidersEl[sliderNum++];
                el.classList.remove('hide');
                el.setAttribute('x', x - pointR);
                el.setAttribute('y', y+dy - pointR );
            }
        }
        while (sliderNum < missedSlidersEl.length) {
            missedSlidersEl[sliderNum++].classList.add('hide');
        }
    }

    function calcAllPointsByBezierPath(bezierPoints) {

        const pointsCount = Math.ceil(bezierPoints.length / 6);
        let yarr = [];

        let x0 = bezierPoints[0];
        let y0 = bezierPoints[1];
        let ps = 2;

        let x = dx + dx / 2;
        yarr = [y0];


        for (let i = 1; i < pointsCount; i++) {
            const x1 = bezierPoints[ps++];
            const y1 = bezierPoints[ps++];
            const x2 = bezierPoints[ps++];
            const y2 = bezierPoints[ps++];
            const x3 = bezierPoints[ps++];
            const y3 = bezierPoints[ps++];

            while (x <= x3) {
                const y = binaryPointSearch(x, x0, y0, x1, y1, x2, y2, x3, y3);
                yarr.push(Math.round(y * 1000) / 1000);
                x += dx;
            }
            x0 = x3;
            y0 = y3;
        }
        yarr[valuesCount - 1] = bezierPoints[bezierPoints.length - 1];
        return yarr;
    }

    function drawValues(yarr) {
        if (!valuesElement) {
            bezierPath.insertAdjacentHTML('afterEnd',
                `<path id="values-path" stroke="red" fill="none" stroke-width="2" d="M103,70"></path>`);
            valuesElement = document.getElementById('values-path');
        }

        let path = '';
        for (let i = 0, x = dx / 2; i < 64; i++, x += dx) {
            const xx = Math.round(x * 10) / 10;
            path += `M${xx - 5},${yarr[i] - 5} L${xx + 5},${yarr[i] + 5} M${xx + 5},${yarr[i] - 5} L${xx - 5},${yarr[i] + 5} `;
        }
        valuesElement.setAttribute('d', path);
    }

    function binaryPointSearch(x, x1, y1, x2, y2, x3, y3, x4, y4) {
        if (Math.abs(x - x1) < 0.01) return y1;
        if (Math.abs(x - x4) < 0.01) return y4;

        let tMin = 0;
        let tMax = 1;
        for (let i = 0; i < 50; i++) {
            const t = tMin + (tMax - tMin) / 2;
            const xr = x1 + 3 * t * (x2 - x1) + 3 * t * t * (x1 - 2 * x2 + x3) + t * t * t * (x4 - x1 + 3 * x2 - 3 * x3);
            if (Math.abs(xr - x) < 0.001) {
                return y1 + 3 * t * (y2 - y1) + 3 * t * t * (y1 - 2 * y2 + y3) + t * t * t * (y4 - y1 + 3 * y2 - 3 * y3);
            }
            if (xr < x) tMin = t; else tMax = t;
        }
        throw "can't find the next point";

    }

    function convertToCurve() {
        points = convertPointsToCurve();
        clearCanvas();

        points.forEach(p => {
            if (p.y < 0) p.y = 0;
            if (p.y > height) p.y = height;
            p.id = "point-" + (++nextPointId);
        });
        drawPoints();
        drawPath();
    }

    function convertToSliders() {
        changeValues();
    }

    function convertPointsToCurve() {
        let pp = [];
        let ln = points.length;

        for (let i = 0; i < ln; i++) {
            pp[i] = { x: points[i].x, y: points[i].y };
        }


        for (let i = ln - 2; i >= 1; i--) {
            const del = pp.splice(i, 1);
            let bezierPoints = spline(pp);
            const yarr = calcAllPointsByBezierPath(bezierPoints);
            let isBad = false;
            for (let i = 0; i < yarr.length; i++) {
                if (Math.abs(yarr[i] - points[i].y) > 1) {
                    isBad = true;
                    break;
                }
            }
            if (isBad) {
                pp.splice(i, 0, del[0]);
            }
        }
        return pp;
    }

    function calcBizierPoints() {
        let pp = convertPointsToCurve();

        let bezierPoints = spline(pp);

        document.getElementById('linear-path').setAttribute('d', bezierPointsToPath(bezierPoints));

        let el = document.getElementById('calc-points-path');
        if (!el) {
            grpPaths.insertAdjacentHTML('beforeEnd',
                `<path id="calc-points-path" stroke="blue" fill="none" stroke-width="2" d="M103,70"></path>`);
            el = document.getElementById('calc-points-path');
        }
        let path = '';
        for (let i = 0; i < pp.length; i++) {
            const x = Math.round(pp[i].x * 100) / 100;
            const y = Math.round(pp[i].y * 100) / 100;
            path += `M${x - 5},${y} L${x + 5},${y} M${x},${y - 5} L${x},${y + 5} `;
        }
        el.setAttribute('d', path);
    }

    function saveToStorage() {
        localStorage.setItem(storageName, JSON.stringify(storageValue));
    }
    function onPointsChange() {
        if (isTestData) {
            saveToStorage();
        } else {
            //model.on
        }
    }

    function addOrGetBezierPath() {
        let el = grpPaths.getElementsByClassName('bezier-curve')[0]
        if (el) return el;

        grpPaths.insertAdjacentHTML('beforeEnd', `<path class='bezier-curve' stroke="white" fill="none" stroke-width="3" d="M0,0"/>`);
        grpPaths.insertAdjacentHTML('beforeEnd', `<path id="linear-path" stroke="red" fill="none" stroke-width="1" d="M0,0"/>`);
        return grpPaths.getElementsByClassName('bezier-curve')[0];
    }
    function clearCanvas() {
        let list = grpPoints.getElementsByTagName('circle')
        for (let i = list.length - 1; i >= 0; --i) {
            list[i].remove();
        }
        missedSlidersEl = null;
        grpMissedSliders.innerHTML ='';
        
    }

    function hideMissedSliders() {
        if (!missedSlidersEl) return;
        missedSlidersEl.forEach(el => el.classList.add('hide'))
    }

    function bezierPointsToPath(arr) {
        let path = `M${arr[0]},${arr[1]}`;
        for (let i = 2; i < arr.length;) {
            path += ` C${arr[i++]},${arr[i++]},${arr[i++]},${arr[i++]},${arr[i++]},${arr[i++]}`;
        }
        return path;
    }

    function spline(points) {
        let x0 = y0 = x1 = y1 = t0 = NaN;
        let pnum = 0;
        let bezierPoints = [points[0].x, points[0].y];

        points.forEach((p, i) => {
            const x = p.x, y = p.y
            let t1 = NaN;

            if (x === x1 && y === y1) return; // Ignore coincident points.
            switch (pnum) {
                case 0: pnum = 1; break;
                case 1: pnum = 2; break;
                case 2: pnum = 3; point(slope2(t1 = slope3(x, y)), t1); break;
                default: point(t0, t1 = slope3(x, y)); break;
            }

            x0 = x1, x1 = x;
            y0 = y1, y1 = y;
            t0 = t1;
        });

        point(t0, slope2(t0));
        return bezierPoints;

        function bezierCurveTo(...args) {
            args.forEach((a, i) => {
                const p = Math.round(a * 1000) / 1000;
                bezierPoints.push(p);
            });
        }

        function point(t0, t1) {
            const dx = (x1 - x0) / 3;
            bezierCurveTo(x0 + dx, y0 + dx * t0, x1 - dx, y1 - dx * t1, x1, y1);
        }

        function sign(x) {
            return x < 0 ? -1 : 1;
        }

        function slope3(x2, y2) {
            const h0 = x1 - x0,
                h1 = x2 - x1,
                s0 = (y1 - y0) / (h0 || h1 < 0 && -0),
                s1 = (y2 - y1) / (h1 || h0 < 0 && -0),
                p = (s0 * h1 + s1 * h0) / (h0 + h1);
            return (sign(s0) + sign(s1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p)) || 0;
        }
        function slope2(t) {
            const h = x1 - x0;
            return h ? (3 * (y1 - y0) / h - t) / 2 : t;
        }
    }

    function showMissedSliders(visible) {
        areMissedSlidersVisible = visible;
        if (visible) {
            drawPath();
        } else {
            hideMissedSliders();
        }
    }
    return {
        changeValues,
        convertToCurve,
        convertToSliders,
        showMissedSliders,
    }
}