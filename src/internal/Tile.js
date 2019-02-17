import {TileType} from './TileType';

export class Tile {
    constructor(x, y, posOrientation, type, theme) {
        this.x = x;
        this.y = y;
        this.posOrientation = posOrientation;
        this.type = type;
        this.theme = theme;
    }
}