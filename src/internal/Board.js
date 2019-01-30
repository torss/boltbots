import {Tile} from './Tile';

let val = hello(); // val is "Hello";
class Board {
    constructor(width, height, theme, seed) {
        this.tiles = new Array(height);
        for (y = 0; y < height; y++) {
            this.tiles[y] = new Array[width];
            for (x = 0; x < width; x++) {
                this.tiles[y][x] = calcTile(x, y, theme, seed);
            }
        }
    }
    var calcTile = function(x, y, theme, seed) {
        // TODO: Procedurally generate perfect board for a random value of seed.
        var type = "";
        var orientation = "";
        return new Tile(x, y, orientation, type, theme);
    }
}