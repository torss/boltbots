import * as THREE from 'three'

THREE.Matrix3.prototype.makeRotationFromEuler = function (euler) {
  const te = this.elements

  const x = euler.x, y = euler.y, z = euler.z
  const a = Math.cos(x), b = Math.sin(x)
  const c = Math.cos(y), d = Math.sin(y)
  const e = Math.cos(z), f = Math.sin(z)

  if (euler.order === 'XYZ') {
    const ae = a * e, af = a * f, be = b * e, bf = b * f

    te[ 0 ] = c * e
    te[ 3 ] = -c * f
    te[ 6 ] = d

    te[ 1 ] = af + be * d
    te[ 4 ] = ae - bf * d
    te[ 7 ] = -b * c

    te[ 2 ] = bf - ae * d
    te[ 5 ] = be + af * d
    te[ 8 ] = a * c
  } else if (euler.order === 'YXZ') {
    const ce = c * e, cf = c * f, de = d * e, df = d * f

    te[ 0 ] = ce + df * b
    te[ 3 ] = de * b - cf
    te[ 6 ] = a * d

    te[ 1 ] = a * f
    te[ 4 ] = a * e
    te[ 7 ] = -b

    te[ 2 ] = cf * b - de
    te[ 5 ] = df + ce * b
    te[ 8 ] = a * c
  } else if (euler.order === 'ZXY') {
    const ce = c * e, cf = c * f, de = d * e, df = d * f

    te[ 0 ] = ce - df * b
    te[ 3 ] = -a * f
    te[ 6 ] = de + cf * b

    te[ 1 ] = cf + de * b
    te[ 4 ] = a * e
    te[ 7 ] = df - ce * b

    te[ 2 ] = -a * d
    te[ 5 ] = b
    te[ 8 ] = a * c
  } else if (euler.order === 'ZYX') {
    const ae = a * e, af = a * f, be = b * e, bf = b * f

    te[ 0 ] = c * e
    te[ 3 ] = be * d - af
    te[ 6 ] = ae * d + bf

    te[ 1 ] = c * f
    te[ 4 ] = bf * d + ae
    te[ 7 ] = af * d - be

    te[ 2 ] = -d
    te[ 5 ] = b * c
    te[ 8 ] = a * c
  } else if (euler.order === 'YZX') {
    const ac = a * c, ad = a * d, bc = b * c, bd = b * d

    te[ 0 ] = c * e
    te[ 3 ] = bd - ac * f
    te[ 6 ] = bc * f + ad

    te[ 1 ] = f
    te[ 4 ] = a * e
    te[ 7 ] = -b * e

    te[ 2 ] = -d * e
    te[ 5 ] = ad * f + bc
    te[ 8 ] = ac - bd * f
  } else if (euler.order === 'XZY') {
    const ac = a * c, ad = a * d, bc = b * c, bd = b * d

    te[ 0 ] = c * e
    te[ 3 ] = -f
    te[ 6 ] = d * e

    te[ 1 ] = ac * f + bd
    te[ 4 ] = a * e
    te[ 7 ] = ad * f - bc

    te[ 2 ] = bc * f - ad
    te[ 5 ] = b * e
    te[ 8 ] = bd * f + ac
  }

  return this
}

THREE.Matrix3.prototype.makeRotationFromQuaternion = function (quaternion, scale) {
  const te = this.elements

  const x = quaternion._x, y = quaternion._y, z = quaternion._z, w = quaternion._w
  const x2 = x + x, y2 = y + y, z2 = z + z
  const xx = x * x2, xy = x * y2, xz = x * z2
  const yy = y * y2, yz = y * z2, zz = z * z2
  const wx = w * x2, wy = w * y2, wz = w * z2

  let sx, sy, sz
  if (scale) {
    sx = scale.x
    sy = scale.y
    sz = scale.z
  } else {
    sx = sy = sz = 1
  }

  te[ 0 ] = (1 - (yy + zz)) * sx
  te[ 1 ] = (xy + wz) * sx
  te[ 2 ] = (xz - wy) * sx

  te[ 3 ] = (xy - wz) * sy
  te[ 4 ] = (1 - (xx + zz)) * sy
  te[ 5 ] = (yz + wx) * sy

  te[ 6 ] = (xz + wy) * sz
  te[ 7 ] = (yz - wx) * sz
  te[ 8 ] = (1 - (xx + yy)) * sz

  return this
}
