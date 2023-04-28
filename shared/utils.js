function getRandomColor(hueMin, hueMax, satMin, satMax, valMin, valMax, alpMin, alpMax, string) {
    var hue = randomRange(hueMin, hueMax);
    var sat = randomRange(satMin, satMax);
    var val = randomRange(valMin, valMax);
    var alp = randomRange(alpMin, alpMax);
    var rgb = hsvToRgb(hue, sat / 100, val / 100);

    // string parameter is optional, it allows you to pick if you want an RGBA CSS string or an array of RGBA values
    if (string) {
        return 'rgba(' + (rgb[0] * 255) + ', ' + (rgb[1] * 255) + ', ' + (rgb[2] * 255) + ', ' + (alp) + ')';
    }
    return [rgb[0] * 255, rgb[1] * 255, rgb[2] * 255, alp];
}

function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

function hsvToRgb(h, s, v) {
    const calculateColor = (n, k = (n + h / 60) % 6) => {
        const minK = Math.min(k, 4 - k, 1);
        const maxK = Math.max(minK, 0);
        return v - v * s * maxK;
    };

    const red = calculateColor(5);
    const green = calculateColor(3);
    const blue = calculateColor(1);

    return [red, green, blue];
}

// exports (ESM)
export { getRandomColor, randomRange, hsvToRgb };