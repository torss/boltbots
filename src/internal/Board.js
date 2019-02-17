import {Tile} from './Tile';
import {TileType} from './TileType';

class Board {
    constructor(width, height, theme, seed) {
        this.tiles = new Array(height);
        for (y = 0; y < height; y++) {
            this.tiles[y] = new Array[width];
            for (x = 0; x < width; x++) {
                this.tiles[y][x] = calcTile(x, y, theme, seed);
            }
        }



        this.geometry = ""; // or "mesh"?
    }
    var calcTile = function(x, y, theme, seed) {
        // TODO: Procedurally generate perfect board for a random value of seed.


        var type = "";

        
        var orientation = "";


        return new Tile(x, y, orientation, type, theme);
    }
}