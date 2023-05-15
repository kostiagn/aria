function Curve(canvasEl, name, width, height) {

    let points = [];
    const $canvasEl = $(canvasEl);
    const storageName = name + "_curve"

    const pointR = 6;
    let isPointDraging = false;
    let dragingPointIndex;
    let dragingPoint;
    let nextPointId = 0;
    const minDistance = 20;


    const bezierPath = addOrGetBezierPath();

    //canvasEl.insertAdjacentHTML('beforeEnd', `<path stroke="black" fill="none" stroke-width="1" d="M0,0 L0,${height} ${width},${height} ${width},0 0,0"/>`);;

    erasePoints();
    const storageValue = JSON.parse(localStorage.getItem(storageName)) || {};
    if (!storageValue.points) {
        storageValue.points = points;
        addPoint(0, height / 2);
        addPoint(width, height / 2);
    } else {
        points = storageValue.points;
        points.forEach(p => {
            p.id = "point-" + (++nextPointId);
        })
        
        drawPoints();
    }

    drawPath();

    function canAddOrMovePoint(x, index) {
        return points.findIndex((p, i) => i !== index && p && Math.abs(p.x - x) <= minDistance) < 0;
    }

    function findPointIndex(x) {
        const index = points.findIndex(p => p.x > x);
        return index === -1 ? points.length : index;
    }

    function addPoint(x, y) {
        if (!canAddOrMovePoint(x)) return;
        const index = findPointIndex(x);
        const id = "point-" + (++nextPointId);
        const newPoint = { x, y, id };
        points.splice(index, 0, newPoint);

        drawPoint(newPoint);
        saveToStorage();
        return newPoint;
    }

    function drawPoints() {
        points.forEach(p => drawPoint(p));
    }

    function drawPoint(p) {
        canvasEl.insertAdjacentHTML('beforeEnd', `<circle id="${p.id}" class="point" r="${pointR}" cx="${p.x}" cy="${p.y}"/>`);
    }

    function getPoints() {
        return points;
    }

    function getBezierPath() {
        if (points.length === 2) return `M${points[0].x},${points[0].y} L${points[1].x},${points[1].y}`
        return spline(points);
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
                drawPath();
                id = newPoint.id;
            }
            isPointDraging = true;
            dragingPointIndex = getPointIndex(id);
            dragingPoint = document.getElementById(id);
        }

        return false;
    });

    $canvasEl.mousemove(event => {
        if (event.buttons === 0) {
            isPointDraging = false;
        }
        if (!isPointDraging) return;

        const point = points[dragingPointIndex];
        let { x, y } = getMousePos(event);

        if (x < 0) x = 0;
        if (y < 0) y = 0;
        if (x > width) x = width;
        if (y > height) y = height;
        if (dragingPointIndex === 0) x = 0;
        else if (dragingPointIndex === points.length - 1) x = width;
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
            x: evt.clientX - pos.left,
            y: evt.clientY - pos.top
        };
    };

    function movePoint(el, point, newX, newY) {
        point.x = newX;
        point.y = newY;
        el.setAttribute('cx', newX);
        el.setAttribute('cy', newY);
        saveToStorage();

    }
    function drawPath() {
        bezierPath.setAttribute('d', getBezierPath());
    }
    function saveToStorage() {
        localStorage.setItem(storageName, JSON.stringify(storageValue));
    }

    function addOrGetBezierPath() {
        let el = canvasEl.getElementsByClassName('bezier-curve')[0]
        if (el) return el;

        canvasEl.insertAdjacentHTML('beforeEnd', `<path class='bezier-curve' stroke="white" fill="none" stroke-width="5" d="M0,0"/>`);
        return canvasEl.getElementsByClassName('bezier-curve')[0];
    }

    function erasePoints() {
        let list = canvasEl.getElementsByTagName('circle')
        for (let i = list.length - 1; i >= 0; --i) {
            list[i].remove(); 
        }
    }

    return {
        getPoints,
        addPoint,
    }


    function spline(points) {
        let x0 = y0 = x1 = y1 = t0 = NaN;
        let pnum = 0;
        let path = `M${points[0].x},${points[0].y} `

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
        return path;

        function bezierCurveTo(...args) {
            path += 'C';
            args.forEach((a, i) => {
                if (i !== 0) path += ','
                path += Math.round(a * 1000) / 1000;
            });
            path += ' ';
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
}