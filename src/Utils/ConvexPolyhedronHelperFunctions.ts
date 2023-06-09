import * as CANNON from "cannon-es";

export function getVolumeAndCentreOfMass(vertices: number[][], faces: number[][]) : [number, CANNON.Vec3] {
    const mult: number[] = [1 / 6, 1 / 24, 1 / 24, 1 / 24, 1 / 60, 1 / 60, 1 / 60, 1 / 120, 1 / 120, 1 / 120];
    let intg: number[] = [0, 0, 0, 0, 0, 0, 0 ,0 ,0, 0];
    console.log(vertices, faces);
    for (let i = 0; i < faces.length; i++) {
        let i0 = faces[i][0];
        let i1 = faces[i][1];
        let i2 = faces[i][2];

        let x0 = vertices[i0][0];
        let y0 = vertices[i0][1];
        let z0 = vertices[i0][2];

        let x1 = vertices[i1][0];
        let y1 = vertices[i1][1];
        let z1 = vertices[i1][2];

        let x2 = vertices[i2][0];
        let y2 = vertices[i2][1];
        let z2 = vertices[i2][2];

        console.log(x0, y0, z0);
        console.log(x1, y1, z1);
        console.log(x2, y2, z2);
        console.log('------');

        let a1 = x1 - x0;
        let b1 = y1 - y0;
        let c1 = z1 - z0;

        let a2 = x2 - x0;
        let b2 = y2 - y0;
        let c2 = z2 - z0;

        let d0 = b1 * c2 - b2 * c1;
        let d1 = a2 * c1 - a1 * c2;
        let d2 = a1 * b2 - a2 * b1;

        let subExpX = subExpressions(x0, x1, x2);
        let subExpY = subExpressions(y0, y1, y2);
        let subExpZ = subExpressions(z0, z1, z2);

        intg[0] += d0 * subExpX[0];
        intg[1] += d0 * subExpX[1];
        intg[4] += d0 * subExpX[2];

        intg[2] += d1 * subExpY[1];
        intg[5] += d1 * subExpY[2];

        intg[3] += d2 * subExpZ[1];
        intg[6] += d2 * subExpZ[2];

        intg[7] += d0 * (y0 * subExpX[3] + y1 * subExpX[4] + y2 * subExpX[5]);
        intg[8] += d1 * (z0 * subExpY[3] + z1 * subExpY[4] + z2 * subExpY[5]);
        intg[9] += d2 * (x0 * subExpZ[3] + x1 * subExpZ[4] + x2 * subExpZ[5]);
    }

    for ( let j = 0; j < 10; j++) {
        intg[j] = intg[j] * mult[j];
    }

    return [intg[0], new CANNON.Vec3(intg[1]/intg[0], intg[2]/intg[0], intg[3]/intg[0])];
}

function subExpressions(x0: number, x1: number, x2: number): [number, number, number, number, number, number] {

    let temp0 = x0 + x1;
    let f1 = temp0 + x2
    let temp1 = x0 * x0;
    let temp2 = temp1 + x1 * temp0;
    let f2 = temp2 + x2 * f1;
    let f3 = x0 * temp1 + x1 * temp2 + x2 * f2;

    let g0 = f2 + x0 * (f1 + x0);
    let g1 = f2 + x1 * (f1 + x1);
    let g2 = f2 + x2 * (f1 + x2);

    return [f1, f2, f3, g0, g1, g2]
}