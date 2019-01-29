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

  constructor (center, radius, clockwise, trackAngle0, trackAngle1) {
    this.center = center
    this.radius = radius
    this.clockwise = clockwise
    this.trackAngle0 = trackAngle0
    this.trackAngle1 = trackAngle1 || (trackAngle0 + Math.PI) % (2 * Math.PI)
    // this.trackPoint0 = undefined
    this.trackPoint0 = this.getTrackPointFor(this.trackAngle0, 0)
    this.trackPoint1 = this.getTrackPointFor(this.trackAngle1, 0)
  }

  getTrackPointFor (trackAngle, radiusOffset) {
    return new THREE.Vector2(this.center.x + this.radius + radiusOffset, this.center.y)
      .rotateAround(new THREE.Vector2(this.center.x, this.center.y), trackAngle)
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
    // const mesh = new THREE.Mesh(geometry, material)
    // // mesh.position.set(-0.5 * width, 0, -0.5 * depth)
    // parent.add(mesh)
    parent.add(new THREE.LineSegments(new THREE.WireframeGeometry(geometry), material))
  }

  genTrackExtrudePath () {
    const curvePath = new THREE.CurvePath()
    if (this.driveWheels.length < 2) {
      console.warn('TrackDrivePlan.driveWheels.length < 2')
      return curvePath
    }
    // for (const driveWheel of this.driveWheels) {
    //   driveWheel.calcTrackPoint(this.thickness * 0.5)
    // }
    // window.curvePath = curvePath // DEBUG
    for (let i = 1; i < this.driveWheels.length; ++i) {
      const prev = this.driveWheels[i - 1]
      const cur = this.driveWheels[i]

      // const dir0 = new THREE.Vector2().subVectors(cur.center, prev.center)
      // const dir1 = new THREE.Vector2().subVectors(prev.center, cur.center)
      // console.log('dir0', dir0)
      for (const tangentLine of DriveWheelPlan.getTangentLines(prev, cur)) {
        // const dirTlp0 = new THREE.Vector2().copy(tangentLine[0]).sub(prev.center)
        // const dot0 = dirTlp0.sub(prev.center).dot(dir0)
        // console.log('dirTlp0', dirTlp0, dot0)
        // if ((dot0 < 0) !== prev.clockwise) continue
        // console.log('dirTlp0', dirTlp0)
        if ((sideOfLine(tangentLine[0], prev.center, cur.center) < 0) !== prev.clockwise) continue
        // const dirTlp1 = new THREE.Vector2().copy(tangentLine[1]).sub(cur.center)
        // const dot1 = dirTlp1.sub(cur.center).dot(dir1)
        // if ((dot1 < 0) === cur.clockwise) continue
        if ((sideOfLine(tangentLine[1], prev.center, cur.center) < 0) !== cur.clockwise) continue
        if (i >= 2) {
          const prevCurve = curvePath.curves[i - 2]
          const p1 = prevCurve.v2
          const p2 = tangentLine[0]
          const center = prev.center
          const clockwise = prev.clockwise

          const arcOffset = new THREE.Vector2().copy(p1).sub(center).angle()
          let arcLength = new THREE.Vector2().copy(p2).sub(center).angle()
          window.d1 = new THREE.Vector2().copy(p1).sub(center)
          window.d2 = new THREE.Vector2().copy(p2).sub(center)
          // console.log('DEBUG', arcOffset, arcLength)
          arcLength -= arcOffset
          if ((arcLength < 0) !== clockwise) {
            arcLength += 2 * Math.PI
          }
          curvePath.add(new ArcCurve(cur.radius, arcLength, arcOffset, center))

          // const control0 = new THREE.Vector3().lerpVectors(p1, p2, 0.5)
          // curvePath.add(new THREE.CubicBezierCurve3(p2, control0, control0, p1))
        }
        curvePath.add(new THREE.LineCurve3(tangentLine[0], tangentLine[1]))
      }

      // const p0 = new THREE.Vector3()
      // const p1 = new THREE.Vector3()
      // copyXy(prev.trackPoint0, p0)
      // copyXy(cur.trackPoint0, p1)
      // curvePath.add(new THREE.LineCurve3(p0, p1))
      // const p2 = new THREE.Vector3()
      // copyXy(cur.trackPoint1, p2)
      // const dir = new THREE.Vector3().subVectors(p1, p0).normalize().multiplyScalar(cur.radius)
      // const p1r = p1.clone().add(dir)
      // const p2r = p2.clone().add(dir)
      // curvePath.add(new THREE.CubicBezierCurve3(p1, p1r, p2r, p2))
    }
    return curvePath
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
  // path.lineTo(x + width, y + height)
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
    color: 0x20202, // 0x20202,
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

  const shape = new THREE.Shape()
  genTrackCrossSection(shape, 0, 0, depth, thickness, roundedWidth)

  const extrudeSettings = {
    extrudePath: genTrackExtrudePath(0, 0, width, height, radius),
    steps: 200,
    // depth,
    bevelEnabled: false,
    curveSegments: 64
  }

  const geometry = new THREE.ExtrudeBufferGeometry(shape, extrudeSettings)
  // adjustGeometryNormals(geometry)
  const mesh = new THREE.Mesh(geometry, material)
  // mesh.position.set(-0.5 * width, 0, -0.5 * depth)
  // scene.add(mesh)

  const protrusion = 0.025
  const extrudeSettings2 = {
    extrudePath: genDriveWheelExtrudePath(height - thickness), // extrudeSettings.extrudePath, // genDriveWheelExtrudePath(height),
    steps: 64,
    // depth: depth + roundedWidth,
    bevelEnabled: false,
    curveSegments: 64
  }
  //   delete extrudeSettings.extrudePath //
  const shape2 = genDriveWheelCrossSection(depth + roundedWidth + protrusion, height - thickness, protrusion) // shape
  const geometry2 = new THREE.ExtrudeBufferGeometry(shape2, extrudeSettings2)
  const xos = 3
  const xowidth = (width + 1.5 * (height - thickness)) / xos
  for (let x = 0; x < xos; ++x) {
    const mesh2 = new THREE.Mesh(geometry2, material2)
    mesh.add(mesh2)
    mesh2.position.set(radius - 0.5 * (height - thickness) + x * xowidth, thickness, 0)
  }

  // - //

  const trackDrivePlan = new TrackDrivePlan(depth, thickness, roundedWidth)
  const driveWheelRadius = 0.1
  trackDrivePlan.driveWheels.push(new DriveWheelPlan(new THREE.Vector3(0, 0, 0), driveWheelRadius, true, Math.PI * 0.5))
  trackDrivePlan.driveWheels.push(new DriveWheelPlan(new THREE.Vector3(width * 0.5, width * 0.25, 0), driveWheelRadius, true, Math.PI * 0.5))
  trackDrivePlan.driveWheels.push(new DriveWheelPlan(new THREE.Vector3(width, 0, 0), driveWheelRadius, true, Math.PI * 0.5))
  trackDrivePlan.generate(scene, material, material2)
}
