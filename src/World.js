import {ExtendedWorld} from "./World/ExtendedWorld";

var world;
self.onmessage = function (e) {
    console.log(e);
    importScripts(e.data.cannonUrl);
    importScripts('../World/ExtendedWorld.ts');
    //let temp = new ExtendedWorld();
    //console.log(temp);
};