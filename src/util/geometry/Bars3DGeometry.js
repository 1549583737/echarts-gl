/**
 * Geometry collecting bars data
 *
 * @module echarts-gl/chart/bars/BarsGeometry
 * @author Yi Shen(http://github.com/pissang)
 */

var echarts = require('echarts/lib/echarts');
var dynamicConvertMixin = require('./dynamicConvertMixin');
var StaticGeometry = require('qtek/lib/StaticGeometry');

var glMatrix = require('qtek/lib/dep/glmatrix');
var vec3 = glMatrix.vec3;
var mat3 = glMatrix.mat3;

/**
 * @constructor
 * @alias module:echarts-gl/chart/bars/BarsGeometry
 * @extends qtek.StaticGeometry
 */
var BarsGeometry = StaticGeometry.extend(function () {
    return {

        attributes: {
            position: new StaticGeometry.Attribute('position', 'float', 3, 'POSITION'),
            normal: new StaticGeometry.Attribute('normal', 'float', 3, 'NORMAL'),
            color: new StaticGeometry.Attribute('color', 'float', 4, 'COLOR')
        },

        enableNormal: false,

        bevelSize: 1,
        bevelSegments: 0,

        _vertexOffset: 0,
        _faceOffset: 0
    };
},
/** @lends module:echarts-gl/chart/bars/BarsGeometry.prototype */
{

    resetOffset: function () {
        this._vertexOffset = 0;
        this._faceOffset = 0;
    },

    setBarCount: function (barCount) {
        var bevelSegments = this.bevelSegments;
        var enableNormal = this.enableNormal;
        var hasBevel = bevelSegments > 0 && this.bevelSize > 0;
        var vertexCount = (hasBevel
            ? this.getBevelBarVertexCount(bevelSegments) : this.getBarVertexCount()) * barCount;
        var faceCount = (hasBevel
            ? this.getBevelBarFaceCount(bevelSegments) : this.getBarFaceCount()) * barCount;

        if (this.vertexCount !== vertexCount) {
            this.attributes.position.init(vertexCount);
            if (enableNormal) {
                this.attributes.normal.init(vertexCount);
            }
            else {
                this.attributes.normal.value = null;
            }
            this.attributes.color.init(vertexCount);
        }

        if (this.faceCount !== faceCount) {
            this.faces = vertexCount > 0xffff ? new Uint32Array(faceCount * 3) : new Uint16Array(faceCount * 3);
        }
    },

    getBarVertexCount: function () {
        return this.enableNormal ? 24 : 8;
    },

    getBarFaceCount: function () {
        return 12;
    },

    getBevelBarVertexCount: function (bevelSegments) {
        return (bevelSegments + 1) * 4 * (bevelSegments + 1) * 2;
    },

    getBevelBarFaceCount: function (bevelSegments) {
        var widthSegments = bevelSegments * 4 + 3;
        var heightSegments = bevelSegments * 2 + 1;
        return (widthSegments + 1) * heightSegments * 2 + 4;
    },

    /**
     * Add a bar
     * @param {Array.<number>} start
     * @param {Array.<number>} end
     * @param {Array.<number>} orient  right direction
     * @param {Array.<number>} size size on x and z
     * @param {Array.<number>} color
     */
    addBar: (function () {
        var v3Create = vec3.create;
        var v3ScaleAndAdd = vec3.scaleAndAdd;

        var end = v3Create();
        var px = v3Create();
        var py = v3Create();
        var pz = v3Create();
        var nx = v3Create();
        var ny = v3Create();
        var nz = v3Create();

        var pts = [];
        var normals = [];
        for (var i = 0; i < 8; i++) {
            pts[i] = v3Create();
        }

        var cubeFaces4 = [
            // PX
            [0, 1, 5, 4],
            // NX
            [2, 3, 7, 6],
            // PY
            [4, 5, 6, 7],
            // NY
            [3, 2, 1, 0],
            // PZ
            [0, 4, 7, 3],
            // NZ
            [1, 2, 6, 5]
        ];
        var face4To3 = [
            0, 1, 2, 0, 2, 3
        ];
        var cubeFaces3 = [];
        for (var i = 0; i < cubeFaces4.length; i++) {
            var face4 = cubeFaces4[i];
            for (var j = 0; j < 2; j++) {
                var face = [];
                for (var k = 0; k < 3; k++) {
                    face.push(face4[face4To3[j * 3 + k]]);
                }
                cubeFaces3.push(face);
            }
        }
        return function (start, dir, leftDir, size, color) {

            if (this.bevelSize > 0 && this.bevelSegments > 0) {
                this.addBevelBar(start, dir, leftDir, size, this.bevelSize, this.bevelSegments, color);
                return;
            }

            vec3.copy(py, dir);
            vec3.normalize(py, py);
            // x * y => z
            vec3.cross(pz, leftDir, py);
            vec3.normalize(pz, pz);
            // y * z => x
            vec3.cross(px, py, pz);
            vec3.normalize(pz, pz);

            vec3.negate(nx, px);
            vec3.negate(ny, py);
            vec3.negate(nz, pz);

            v3ScaleAndAdd(pts[0], start, px, size[0] / 2);
            v3ScaleAndAdd(pts[0], pts[0], pz, size[2] / 2);
            v3ScaleAndAdd(pts[1], start, px, size[0] / 2);
            v3ScaleAndAdd(pts[1], pts[1], nz, size[2] / 2);
            v3ScaleAndAdd(pts[2], start, nx, size[0] / 2);
            v3ScaleAndAdd(pts[2], pts[2], nz, size[2] / 2);
            v3ScaleAndAdd(pts[3], start, nx, size[0] / 2);
            v3ScaleAndAdd(pts[3], pts[3], pz, size[2] / 2);

            v3ScaleAndAdd(end, start, py, size[1]);

            v3ScaleAndAdd(pts[4], end, px, size[0] / 2);
            v3ScaleAndAdd(pts[4], pts[4], pz, size[2] / 2);
            v3ScaleAndAdd(pts[5], end, px, size[0] / 2);
            v3ScaleAndAdd(pts[5], pts[5], nz, size[2] / 2);
            v3ScaleAndAdd(pts[6], end, nx, size[0] / 2);
            v3ScaleAndAdd(pts[6], pts[6], nz, size[2] / 2);
            v3ScaleAndAdd(pts[7], end, nx, size[0] / 2);
            v3ScaleAndAdd(pts[7], pts[7], pz, size[2] / 2);

            var attributes = this.attributes;
            if (this.enableNormal) {
                normals[0] = px;
                normals[1] = nx;
                normals[2] = py;
                normals[3] = ny;
                normals[4] = pz;
                normals[5] = nz;

                var vertexOffset = this._vertexOffset;
                for (var i = 0; i < cubeFaces4.length; i++) {
                    var idx3 = this._faceOffset * 3;
                    for (var k = 0; k < 6; k++) {
                        this.faces[idx3++] = vertexOffset + face4To3[k];
                    }
                    vertexOffset += 4;
                    this._faceOffset += 2;
                }

                for (var i = 0; i < cubeFaces4.length; i++) {
                    var normal = normals[i];
                    for (var k = 0; k < 4; k++) {
                        var idx = cubeFaces4[i][k];
                        attributes.position.set(this._vertexOffset, pts[idx]);
                        attributes.normal.set(this._vertexOffset, normal);
                        attributes.color.set(this._vertexOffset++, color);
                    }
                }
            }
            else {
                for (var i = 0; i < cubeFaces3.length; i++) {
                    var idx3 = this._faceOffset * 3;
                    for (var k = 0; k < 3; k++) {
                        this.faces[idx3 + k] = cubeFaces3[i][k] + this._vertexOffset;
                    }
                    this._faceOffset++;
                }

                for (var i = 0; i < pts.length; i++) {
                    attributes.position.set(this._vertexOffset, pts[i]);
                    attributes.color.set(this._vertexOffset++, color);
                }
            }
        };
    })(),

    /**
     * Add a bar with bevel
     * @param {Array.<number>} start
     * @param {Array.<number>} end
     * @param {Array.<number>} orient  right direction
     * @param {Array.<number>} size size on x and z
     * @param {number} bevelSize
     * @param {number} bevelSegments
     * @param {Array.<number>} color
     */
    addBevelBar: (function () {
        var px = vec3.create();
        var py = vec3.create();
        var pz = vec3.create();

        var rotateMat = mat3.create();

        var bevelStartSize = [];
        return function (start, dir, leftDir, size, bevelSize, bevelSegments, color) {
            vec3.copy(py, dir);
            vec3.normalize(py, py);
            // x * y => z
            vec3.cross(pz, leftDir, py);
            vec3.normalize(pz, pz);
            // y * z => x
            vec3.cross(px, py, pz);
            vec3.normalize(pz, pz);

            rotateMat[0] = px[0]; rotateMat[1] = px[1]; rotateMat[2] = px[2];
            rotateMat[3] = py[0]; rotateMat[4] = py[1]; rotateMat[5] = py[2];
            rotateMat[6] = pz[0]; rotateMat[7] = pz[1]; rotateMat[8] = pz[2];

            for (var i = 0; i < 3; i++) {
                bevelStartSize[i] = Math.max(size[i] - bevelSize * 2, 0);
            }
            var rx = (size[0] - bevelStartSize[0]) / 2;
            var ry = (size[1] - bevelStartSize[1]) / 2;
            var rz = (size[2] - bevelStartSize[2]) / 2;

            var pos = [];
            var normal = [];
            var vertexOffset = this._vertexOffset;

            var xOffsets = [1, -1, -1, 1];
            var zOffsets = [1, 1, -1, -1];
            var yOffsets = [2, 0];

            var endIndices = [];
            for (var i = 0; i < 2; i++) {
                endIndices[i] = endIndices[i] = [];

                for (var m = 0; m <= bevelSegments; m++) {
                    for (var j = 0; j < 4; j++) {
                        if ((m === 0 && i === 0) || (i === 1 && m === bevelSegments)) {
                            endIndices[i].push(vertexOffset);
                        }
                        for (var n = 0; n <= bevelSegments; n++) {

                            var phi = n / bevelSegments * Math.PI / 2 + Math.PI / 2 * j;
                            var theta = m / bevelSegments * Math.PI / 2 + Math.PI / 2 * i;

                            normal[0] = rx * Math.cos(phi) * Math.sin(theta);
                            normal[1] = ry * Math.cos(theta);
                            normal[2] = rz * Math.sin(phi) * Math.sin(theta);
                            pos[0] = normal[0] + xOffsets[j] * bevelStartSize[0] / 2;
                            pos[1] = normal[1] + yOffsets[i] * bevelStartSize[1] / 2;
                            pos[2] = normal[2] + zOffsets[j] * bevelStartSize[2] / 2;

                            vec3.normalize(normal, normal);

                            vec3.transformMat3(pos, pos, rotateMat);
                            vec3.transformMat3(normal, normal, rotateMat);
                            vec3.add(pos, pos, start);

                            this.attributes.position.set(vertexOffset, pos);
                            if (this.enableNormal) {
                                this.attributes.normal.set(vertexOffset, normal);
                            }
                            this.attributes.color.set(vertexOffset, color);
                            vertexOffset++;
                        }
                    }
                }
            }

            var widthSegments = bevelSegments * 4 + 3;
            var heightSegments = bevelSegments * 2 + 1;

            var len = widthSegments + 1;

            for (var j = 0; j < heightSegments; j ++) {
                for (var i = 0; i <= widthSegments; i ++) {
                    var i2 = j * len + i + this._vertexOffset;
                    var i1 = (j * len + (i + 1) % len) + this._vertexOffset;
                    var i4 = (j + 1) * len + (i + 1) % len + this._vertexOffset;
                    var i3 = (j + 1) * len + i + this._vertexOffset;

                    this.setFace(this._faceOffset++, [i4, i2, i1]);
                    this.setFace(this._faceOffset++, [i4, i3, i2]);
                }
            }

            // Close top and bottom
            this.setFace(this._faceOffset++, [endIndices[0][0], endIndices[0][2], endIndices[0][1]]);
            this.setFace(this._faceOffset++, [endIndices[0][0], endIndices[0][3], endIndices[0][2]]);
            this.setFace(this._faceOffset++, [endIndices[1][0], endIndices[1][1], endIndices[1][2]]);
            this.setFace(this._faceOffset++, [endIndices[1][0], endIndices[1][2], endIndices[1][3]]);

            this._vertexOffset = vertexOffset;
        };
    })()
});

echarts.util.defaults(BarsGeometry.prototype, dynamicConvertMixin);

module.exports = BarsGeometry;