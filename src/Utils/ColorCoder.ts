export function RainBowColor(length, maxLength)
{
    let range = 60;
    var i = (length * range / maxLength);

    var r = Math.round(Math.sin(0.024 * i + 0) * (range - 1) + range);
    var g = Math.round(Math.sin(0.024 * i + 2) * (range - 1) + range);
    var b = Math.round(Math.sin(0.024 * i + 4) * (range - 1) + range);

    //increase brightness
    let brightnessFactor = 2
    r = Math.min(255, Math.ceil(r * brightnessFactor));
    g = Math.min(255, Math.ceil(g * brightnessFactor));
    b = Math.min(255, Math.ceil(b * brightnessFactor));

    return 'rgb(' + r + ',' + g + ',' + b + ')';
}