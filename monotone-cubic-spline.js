/* https://en.wikipedia.org/wiki/Monotone_cubic_interpolation
 * Monotone cubic spline interpolation
 * Usage example listed at bottom; this is a fully-functional package. For
 * example, this can be executed either at sites like
 * https://www.programiz.com/javascript/online-compiler/
 * or using nodeJS.
 */
function DEBUG(s) {
    /* Uncomment the following to enable verbose output of the solver: */
    console.log(s);
}
var outputCounter = 0;
var createInterpolant = function(xs, ys) {
    var i, length = xs.length;
    
    // Deal with length issues
    if (length != ys.length) { throw 'Need an equal count of xs and ys.'; }
    if (length === 0) { return function(x) { return 0; }; }
    if (length === 1) {
        // Impl: Precomputing the result prevents problems if ys is mutated later and allows garbage collection of ys
        // Impl: Unary plus properly converts values to numbers
        var result = +ys[0];
        return function(x) { return result; };
    }
    
    // Rearrange xs and ys so that xs is sorted
    var indexes = [];
    for (i = 0; i < length; i++) { indexes.push(i); }
    indexes.sort(function(a, b) { return xs[a] < xs[b] ? -1 : 1; });
    var oldXs = xs, oldYs = ys;
    // Impl: Creating new arrays also prevents problems if the input arrays are mutated later
    xs = []; ys = [];
    // Impl: Unary plus properly converts values to numbers
    for (i = 0; i < length; i++) { 
        xs[i] = +oldXs[indexes[i]];
        ys[i] = +oldYs[indexes[i]];
    }

    DEBUG("debug: xs = [ " + xs + " ]")
    DEBUG("debug: ys = [ " + ys + " ]")
    
    // Get consecutive differences and slopes
    var dys = [], dxs = [], ms = [];
    for (i = 0; i < length - 1; i++) {
        var dx = xs[i + 1] - xs[i], dy = ys[i + 1] - ys[i];
        dxs[i] = dx;
        dys[i] = dy;
        ms[i] = dy/dx;
    }
    // Get degree-1 coefficients
    var c1s = [ms[0]];
    for (i = 0; i < dxs.length - 1; i++) {
        var m = ms[i], mNext = ms[i + 1];
        if (m*mNext <= 0) {
            c1s[i] = 0;
        } else {
            var dx_ = dxs[i], dxNext = dxs[i + 1], common = dx_ + dxNext;
            c1s[i] = 3*common/((common + dxNext)/m + (common + dx_)/mNext);
        }
    }
    c1s.push(ms[ms.length - 1]);

    DEBUG("debug: dxs = [ " + dxs + " ]")
    DEBUG("debug: ms = [ " + ms + " ]")
    DEBUG("debug: c1s.length = " + c1s.length)
    DEBUG("debug: c1s = [ " + c1s + " ]")
    
    // Get degree-2 and degree-3 coefficients
    var c2s = [], c3s = [];
    for (i = 0; i < c1s.length - 1; i++) {
        var c1 = c1s[i];
        var m_ = ms[i];
        var invDx = 1/dxs[i];
        var common_ = c1 + c1s[i + 1] - m_ - m_;
        DEBUG("debug: " + i + ". c1 = " + c1);
        DEBUG("debug: " + i + ". m_ = " + m_);
        DEBUG("debug: " + i + ". invDx = " + invDx);
        DEBUG("debug: " + i + ". common_ = " + common_);
        c2s[i] = (m_ - c1 - common_)*invDx;
        c3s[i] = common_*invDx*invDx;
    }
    DEBUG("debug: c2s = [ " + c2s + " ]")
    DEBUG("debug: c3s = [ " + c3s + " ]")

    // Return interpolant function
    return function(x) {
        // The rightmost point in the dataset should give an exact result
        var i = xs.length - 1;
        // Uncomment the following to return only the interpolated value.
        //if (x == xs[i]) { return ys[i]; }
        
        // Search for the interval x is in, returning the corresponding y if x is one of the original xs
        var low = 0, mid, high = c3s.length - 1;
        while (low <= high) {
            mid = Math.floor(0.5*(low + high));
            var xHere = xs[mid];
            if (xHere < x) { low = mid + 1; }
            else if (xHere > x) { high = mid - 1; }
            else {
                // Uncomment the following to return only the interpolated value.
                //return ys[mid];
                low = c3s.length - 1;
                high = mid;
                break;
            }
        }
        i = Math.max(0, high);

        // Interpolate
        var diff = x - xs[i];
        outputCounter++;
        var interpolatedValue = ys[i] + diff * (c1s[i] + diff *  (c2s[i] + diff * c3s[i]));
        // The value of the interpolator's derivative at this point.
        var derivativeValue = c1s[i] + diff * (2*c2s[i] + diff * 3*c3s[i]);
        DEBUG("debug: #" + outputCounter + ". x = " + x + ". i = " + i + ", diff = " + diff + ", interpolatedValue = " + interpolatedValue + ", derivativeValue = " + derivativeValue);
        // Uncomment the following to return only the interpolated value.
        // return interpolatedValue;
        return [ interpolatedValue, derivativeValue ];
    };
};