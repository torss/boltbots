import * as THREE from 'three'
import {getCircleTangentLinesVec} from './CircleTangentLines'

/* eslint-disable no-unused-vars */

// https://en.wikipedia.org/wiki/Continuous_track#/media/File:Tracks_(diagram).png

function copyXy (src, dst) {
  dst.x = src.x
  dst.y = src.y
  return dst
}

function sideOfLine (point, linePoint0, linePoint1) {
  return (point.x - linePoint0.x) * (linePoint1.y - linePoint0.y) - (point.y - linePoint0.y) * (linePoint1.x - linePoint0.x)
}

// http://www.html5gamedevs.com/topic/17310-threejs-using-an-ellipsecurve-as-an-extrusion-path/?tab=comments#comment-113134
class ArcCurve extends THREE.Curve {
  constructor (radius, arcLength, arcOffset = 0, position = undefined) {
    super()
    this.radius = radius
    this.arcOffset = arcOffset
    this.arcLength = arcLength
    this.position = position
  }

  getPoint (t) {
    const angle = this.arcOffset + this.arcLength * t
    const point = new THREE.Vector3(this.radius * Math.cos(angle), this.radius * Math.sin(angle), 0)
    if (this.position) point.add(this.position)
    return point
  }
}

class DriveWheelPlan {
  static getTangentLines (driveWheel0, driveWheel1) {
    return getCircleTangentLinesVec(driveWheel0.center, driveWheel0.radius, driveWheel1.center, driveWheel1.radius, THREE.Vector3)
  }

  constructor (center, radius, clockwise) {
    this.center = center
    this.radius = radius
    this.clockwise = clockwise
  }

  generate (depth, material) {
    const protrusion = 0.025
    const extrudeSettings = {
      extrudePath: genDriveWheelExtrudePath(this.radius),
      steps: 64,
      bevelEnabled: false,
      curveSegments: 64
    }
    const shape = genDriveWheelCrossSection(depth + protrusion, this.radius, protrusion)
    const geometry = new THREE.ExtrudeBufferGeometry(shape, extrudeSettings)
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.copy(this.center)
    return mesh
  }
}

class TrackDrivePlan {
  constructor (depth, thickness, roundedWidth) {
    this.driveWheels = []
    this.depth = depth
    this.thickness = thickness
    this.roundedWidth = roundedWidth
  }

  generate (parent, trackMaterial, driveWheelMaterial) {
    const driveWheelDepth = this.depth + this.roundedWidth
    for (const driveWheel of this.driveWheels) {
      parent.add(driveWheel.generate(driveWheelDepth, driveWheelMaterial))
    }
    this.generateTrack(parent, trackMaterial)
  }

  generateTrack (parent, material) {
    const shape = new THREE.Shape()
    genTrackCrossSection(shape, 0, 0, this.depth, this.thickness, this.roundedWidth)
    const extrudeSettings = {
      extrudePath: this.genTrackExtrudePath(),
      steps: 200,
      bevelEnabled: false,
      curveSegments: 64
    }
    const geometry = new THREE.ExtrudeBufferGeometry(shape, extrudeSettings)
    parent.add(new THREE.LineSegments(new THREE.WireframeGeometry(geometry), new THREE.MeshPhongMaterial({
      emissive: 0x00ffff,
      envMap: material.envMap
    })))

    const mesh = new THREE.Mesh(geometry, material)
    parent.add(mesh)
  }

  genTrackExtrudePath () {
    const curvePath = new THREE.CurvePath()
    if (this.driveWheels.length === 0) {
      console.warn('TrackDrivePlan.driveWheels.length === 0')
      return curvePath
    }
    if (this.driveWheels.length < 2) {
      const wheel = this.driveWheels[0]
      curvePath.add(new ArcCurve(wheel.radius, Math.PI * 2, 0, wheel.center))
      return curvePath
    }
    let prevCurve
    for (let i = 1; i <= this.driveWheels.length; ++i) {
      const prev = this.driveWheels[i - 1]
      const cur = this.driveWheels[i % this.driveWheels.length]

      for (const tangentLine of DriveWheelPlan.getTangentLines(prev, cur)) {
        if ((sideOfLine(tangentLine[0], prev.center, cur.center) < 0) !== prev.clockwise) continue
        if ((sideOfLine(tangentLine[1], prev.center, cur.center) < 0) !== cur.clockwise) continue
        if (i >= 2) TrackDrivePlan.genTrackExtrudeArc(curvePath, prevCurve.v2, tangentLine[0], prev)
        prevCurve = new THREE.LineCurve3(tangentLine[0], tangentLine[1])
        curvePath.add(prevCurve)
      }
    }
    TrackDrivePlan.genTrackExtrudeArc(curvePath, prevCurve.v2, curvePath.curves[0].v1, this.driveWheels[0])
    return curvePath
  }

  static genTrackExtrudeArc (curvePath, p1, p2, driveWheel) {
    const {center, clockwise, radius} = driveWheel
    const arcOffset = new THREE.Vector2().copy(p1).sub(center).angle()
    let arcLength = new THREE.Vector2().copy(p2).sub(center).angle()
    arcLength -= arcOffset
    if ((arcLength < 0) && !clockwise) {
      arcLength += 2 * Math.PI
    } else if ((arcLength > 0) && clockwise) {
      arcLength -= 2 * Math.PI
    }
    curvePath.add(new ArcCurve(radius, arcLength, arcOffset, center))
  }
}

function genDriveWheelCrossSection (width, height, protrusion, path = new THREE.Shape()) {
  const track = protrusion
  const inner = width / 2
  const proth = protrusion / 2
  const wh = 0.5 * width
  const wp = wh + protrusion
  const hh = height
  path.moveTo(-inner, hh)
  path.lineTo(-wp, proth)
  path.lineTo(-wh, 0)
  path.bezierCurveTo(-wh, track, wh, track, wh, 0)
  path.lineTo(wp, proth)
  path.lineTo(inner, hh)
  return path
}

function genDriveWheelExtrudePath (height) {
  const curvePath = new THREE.CurvePath()
  var c = 0.5522847498307933984022516322796
  const r = height
  curvePath.add(new THREE.CubicBezierCurve3(
    new THREE.Vector3(0, -r, 0),
    new THREE.Vector3(c * r, -r, 0),
    new THREE.Vector3(r, -c * r, 0),
    new THREE.Vector3(r, 0, 0)
  ))
  curvePath.add(new THREE.CubicBezierCurve3(
    new THREE.Vector3(r, 0, 0),
    new THREE.Vector3(r, c * r, 0),
    new THREE.Vector3(c * r, r, 0),
    new THREE.Vector3(0, r, 0)
  ))
  curvePath.add(new THREE.CubicBezierCurve3(
    new THREE.Vector3(0, r, 0),
    new THREE.Vector3(-c * r, r, 0),
    new THREE.Vector3(-r, c * r, 0),
    new THREE.Vector3(-r, 0, 0)
  ))
  curvePath.add(new THREE.CubicBezierCurve3(
    new THREE.Vector3(-r, 0, 0),
    new THREE.Vector3(-r, -c * r, 0),
    new THREE.Vector3(-c * r, -r, 0),
    new THREE.Vector3(0, -r, 0)
  ))
  return curvePath
}

function genTrackCrossSection (path, x, y, width, height, radius) {
  x -= 0.5 * width; y -= 0.5 * height
  path.moveTo(x, y)
  path.lineTo(x + width, y)
  path.bezierCurveTo(x + width + radius, y, x + width + radius, y + height, x + width, y + height)
  path.lineTo(x, y + height)
  path.bezierCurveTo(x - radius, y + height, x - radius, y, x, y)
  return path
}

function genTrackExtrudePath (x, y, width, height, radius) {
  const curvePath = new THREE.CurvePath()
  const p0r = new THREE.Vector3(x + radius, y, 0)
  const p0 = new THREE.Vector3(x, y, 0)
  const p1r = new THREE.Vector3(x + width - radius, y, 0)
  const p1 = new THREE.Vector3(x + width, y, 0)
  const p2r = new THREE.Vector3(x + width - radius, y + height, 0)
  const p2 = new THREE.Vector3(x + width, y + height, 0)
  const p3r = new THREE.Vector3(x + radius, y + height, 0)
  const p3 = new THREE.Vector3(x, y + height, 0)
  curvePath.add(new THREE.LineCurve3(p0r, p1r))
  curvePath.add(new THREE.CubicBezierCurve3(p1r, p1, p2, p2r))
  curvePath.add(new THREE.LineCurve3(p2r, p3r))
  curvePath.add(new THREE.CubicBezierCurve3(p3r, p3, p0, p0r))
  return curvePath
}

export function trackTest (scene, materialParam) {
  const material = new THREE.MeshStandardMaterial({
    color: 0x20202,
    metalness: 0.10,
    roughness: 0.90,
    envMap: materialParam.envMap,
    envMapIntensity: 20
  })
  const material2 = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.15,
    roughness: 0.80,
    envMap: materialParam.envMap,
    envMapIntensity: 15
  })

  const width = 0.6, height = 0.1, depth = 0.1
  const radius = 0.1
  const thickness = 0.05
  const roundedWidth = 0.05

  // - //

  const trackDrivePlan = new TrackDrivePlan(depth, thickness, roundedWidth)
  const driveWheelRadius = 0.1
  if (true) { // eslint-disable-line no-constant-condition
    trackDrivePlan.driveWheels.push(new DriveWheelPlan(new THREE.Vector3(0, 0, 0), driveWheelRadius, true))
    trackDrivePlan.driveWheels.push(new DriveWheelPlan(new THREE.Vector3(width * 0.5, width * 0.15, 0), driveWheelRadius * 0.5, false))
    trackDrivePlan.driveWheels.push(new DriveWheelPlan(new THREE.Vector3(width * 1.00, width * 0.15, 0), driveWheelRadius * 0.5, false))
    trackDrivePlan.driveWheels.push(new DriveWheelPlan(new THREE.Vector3(width * 1.5, 0, 0), driveWheelRadius, true))
    trackDrivePlan.driveWheels.push(new DriveWheelPlan(new THREE.Vector3(width * 1.1, -width * 0.1, 0), driveWheelRadius, true))
    trackDrivePlan.driveWheels.push(new DriveWheelPlan(new THREE.Vector3(width * 0.4, -width * 0.1, 0), driveWheelRadius, true))
  } else {
    trackDrivePlan.driveWheels.push(new DriveWheelPlan(new THREE.Vector3(0, 0, 0), driveWheelRadius, true))
    trackDrivePlan.driveWheels.push(new DriveWheelPlan(new THREE.Vector3(width * 0.50, width * 0.25, 0), driveWheelRadius, true))
    trackDrivePlan.driveWheels.push(new DriveWheelPlan(new THREE.Vector3(width * 1.00, width * 0.25, 0), driveWheelRadius, false))
    trackDrivePlan.driveWheels.push(new DriveWheelPlan(new THREE.Vector3(width * 1.5, 0, 0), driveWheelRadius, true))
    trackDrivePlan.driveWheels.push(new DriveWheelPlan(new THREE.Vector3(width * 0.75, -width * 0.1, 0), driveWheelRadius, true))
  }
  trackDrivePlan.generate(scene, material, material2)
}
