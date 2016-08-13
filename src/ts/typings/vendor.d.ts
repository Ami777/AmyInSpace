declare module Phaser{
    interface TileSprite {
        sendToBack:any;
    }
}
declare var store : any;

interface Array<T> {
    fill(value: T, start?: number, end?: number): Array<T>;
}