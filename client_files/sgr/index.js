// SGR — Safe Ground Raycast (RAGE:MP)
// https://github.com/ounezz/safegroundraycast
//
// MIT License
//
// Copyright (c) 2026 ounezz
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

var Settings = require('sgr/data.js');
var MathS = require('sgr/math.js');

var dimsCache = new Map();
var aligned = new Set();

function v3(x, y, z) {
    return new mp.Vector3(x, y, z);
}

function releaseEntityGuid(entity) {
    if (!entity) return;
    try {
        var handle = entity.handle != null ? entity.handle : entity;
        if (!handle) return;
        mp.game.shapetest.releaseScriptGuidFromEntity(handle);
    } catch (e) {}
}

function getDims(model) {
    var cached = dimsCache.get(model);
    if (cached) return cached;

    var res = mp.game.gameplay.getModelDimensions(model);
    if (!res) return null;
    var min = res.min || res[0];
    var max = res.max || res[1];
    if (!min || !max) return null;
    if (Math.abs(max.x - min.x) < 0.01 && Math.abs(max.y - min.y) < 0.01 && Math.abs(max.z - min.z) < 0.01) {
        return null;
    }

    var dims = {
        min: v3(min.x, min.y, min.z),
        max: v3(max.x, max.y, max.z),
    };
    dimsCache.set(model, dims);
    return dims;
}

function localCorners(min, max) {
    return [
        v3(min.x, min.y, min.z),
        v3(max.x, min.y, min.z),
        v3(min.x, max.y, min.z),
        v3(max.x, max.y, min.z),
        v3(min.x, min.y, max.z),
        v3(max.x, min.y, max.z),
        v3(min.x, max.y, max.z),
        v3(max.x, max.y, max.z),
    ];
}

function worldCorners(obj) {
    var dims = getDims(obj.model);
    if (!dims) return null;
    var locals = localCorners(dims.min, dims.max);
    var corners = [];
    for (var i = 0; i < locals.length; i++) {
        var point = locals[i];
        var world = mp.game.entity.getOffsetFromInWorldCoords(obj.handle, point.x, point.y, point.z);
        if (!world) return null;
        corners.push(world);
    }
    return corners;
}

function bottomIdx(corners) {
    var order = [];
    for (var i = 0; i < corners.length; i++) order.push(i);
    order.sort(function (a, b) {
        return corners[a].z - corners[b].z;
    });
    return order.slice(0, 4);
}

function raycastGround(x, y, zAtPoint, ignoreEntity) {
    // Сначала короткий луч. Если точка уже внутри склона, он ничего не находит —
    // тогда стартуем выше, пока не пересечём поверхность сверху.
    var lifts = [
        Settings.cfg.z_hint + Settings.cfg.ray.up,
        2.5,
        4.5,
        8,
    ];
    var ignore = ignoreEntity || undefined;
    for (var i = 0; i < lifts.length; i++) {
        var start = v3(x, y, zAtPoint + lifts[i]);
        var end = v3(x, y, zAtPoint - Settings.cfg.ray.down);
        var hit = null;
        try {
            hit = mp.raycasting.testPointToPoint(start, end, ignore, Settings.cfg.ray.flags);
        } catch (e) {
            return null;
        }
        if (!hit || !hit.position || !isFinite(hit.position.z)) {
            releaseEntityGuid(hit && hit.entity);
            continue;
        }
        var normal = hit.normal || hit.surfaceNormal;
        if (normal && normal.z < 0.15) {
            releaseEntityGuid(hit.entity);
            continue;
        }
        if (Math.abs(hit.position.z - zAtPoint) > Settings.cfg.max_shift) {
            releaseEntityGuid(hit.entity);
            continue;
        }
        releaseEntityGuid(hit.entity);
        return {
            z: hit.position.z,
            n: normal ? MathS.v3(normal.x, normal.y, normal.z) : undefined,
        };
    }
    return null;
}

function groundZ(x, y, zAtPoint, ignoreEntity) {
    var hit = raycastGround(x, y, zAtPoint, ignoreEntity);
    if (hit && Math.abs(hit.z - zAtPoint) <= Settings.cfg.max_shift) return hit.z;

    var z = mp.game.gameplay.getGroundZFor3dCoord(x, y, zAtPoint + 8, false, false);
    if (!isFinite(z)) return null;
    if (z === 0 && Math.abs(zAtPoint) > 2) return null;
    if (Math.abs(z - zAtPoint) > Settings.cfg.max_shift) return null;
    return z;
}

function objectYaw(obj) {
    return obj.rotation ? obj.rotation.z : 0;
}

function quatKeepYaw(yawDeg, up) {
    var yaw = MathS.deg2rad(yawDeg);
    // В GTA rotation.z = 0 смотрит на +Y. (cos, sin) из исходника смотрел на +X и крутил проп на 90°.
    var f0 = MathS.v3(-Math.sin(yaw), Math.cos(yaw), 0);

    var f = MathS.sub3(f0, MathS.mul3(up, MathS.dot3(f0, up)));
    if (MathS.len3(f) < 1e-6) {
        f = MathS.v3(-Math.cos(yaw), -Math.sin(yaw), 0);
        f = MathS.sub3(f, MathS.mul3(up, MathS.dot3(f, up)));
    }

    f = MathS.norm3(f);
    var r = MathS.norm3(MathS.cross3(f, up));
    var f2 = MathS.norm3(MathS.cross3(up, r));
    return MathS.mat3_to_quat(r, f2, up);
}

function settleZ(obj) {
    var corners = worldCorners(obj);
    if (!corners) return false;
    var idx = bottomIdx(corners);
    var maxD = -Infinity;
    var minD = Infinity;

    for (var n = 0; n < idx.length; n++) {
        var p = corners[idx[n]];
        var gz = groundZ(p.x, p.y, p.z, obj.handle);
        if (gz == null) continue;
        var d = gz - p.z;
        if (d > maxD) maxD = d;
        if (d < minD) minD = d;
    }

    if (!isFinite(maxD) || !isFinite(minD)) return false;
    if (Math.abs(maxD) > Settings.cfg.max_shift) return false;

    var eps = Settings.cfg.eps;
    var dz = 0;
    if (maxD > 0) dz = maxD + eps;
    else if (minD < -eps) dz = minD + eps;

    if (dz !== 0) {
        var next = v3(obj.position.x, obj.position.y, obj.position.z + dz);
        obj.position = next;
        try {
            mp.game.entity.setCoordsNoOffset(obj.handle, next.x, next.y, next.z, false, false, false);
        } catch (e) {}
    }
    return true;
}

function align(obj, iters, layOnSide) {
    var yaw0 = objectYaw(obj);
    var qSide = layOnSide ? MathS.quat_axis_angle(MathS.v3(1, 0, 0), 90) : MathS.quat_make();

    for (var it = 0; it < iters; it++) {
        var corners = worldCorners(obj);
        if (!corners) return false;
        var idx = bottomIdx(corners);
        var samples = [];

        for (var n = 0; n < idx.length; n++) {
            var p = corners[idx[n]];
            var gz = groundZ(p.x, p.y, p.z, obj.handle);
            if (gz == null) continue;
            samples.push(MathS.v3(p.x, p.y, gz));
        }

        if (samples.length < Settings.cfg.min_samples) return false;

        var normal = MathS.fit_plane_normal(samples);
        if (!normal) return false;

        var qAlign = quatKeepYaw(yaw0, normal);
        var qFinal = MathS.quat_norm(MathS.quat_mul(qAlign, qSide));

        mp.game.invoke(
            '0x77B21BE7AC540F07',
            obj.handle,
            qFinal.x,
            qFinal.y,
            qFinal.z,
            qFinal.w
        );

        if (!settleZ(obj)) return false;
    }

    return true;
}

function debugBox(obj) {
    var dbg = Settings.cfg.debug;
    if (!dbg.lines && !dbg.box) return;
    if (!mp.objects.exists(obj) || !obj.handle) return;

    var corners = worldCorners(obj);
    if (!corners) return;

    if (dbg.lines) {
        var bottom = bottomIdx(corners);
        for (var n = 0; n < bottom.length; n++) {
            var p = corners[bottom[n]];
            var start = v3(p.x, p.y, p.z + Settings.cfg.ray.up);
            var end = v3(p.x, p.y, p.z - Settings.cfg.ray.down);
            var hit = null;
            try {
                hit = mp.raycasting.testPointToPoint(start, end, obj.handle, Settings.cfg.ray.flags);
            } catch (e) {}

            mp.game.graphics.drawLine(start.x, start.y, start.z, end.x, end.y, end.z, 0, 128, 255, 180);
            if (hit && hit.position) {
                mp.game.graphics.drawLine(p.x, p.y, p.z, hit.position.x, hit.position.y, hit.position.z, 0, 255, 0, 255);
            }
            releaseEntityGuid(hit && hit.entity);
        }
    }

    if (dbg.box) {
        for (var e = 0; e < Settings.edges.length; e++) {
            var a = corners[Settings.edges[e][0]];
            var b = corners[Settings.edges[e][1]];
            mp.game.graphics.drawLine(a.x, a.y, a.z, b.x, b.y, b.z, 255, 0, 0, 255);
        }
    }
}

var Sgr = {
    apply(obj, layOnSide, iters, force) {
        if (!mp.objects.exists(obj) || !obj.handle) return false;
        if (layOnSide == null) layOnSide = Settings.cfg.lay_on_side;
        if (iters == null) iters = Settings.cfg.iters;

        if (!force && aligned.has(obj.handle)) {
            debugBox(obj);
            return true;
        }

        var ok = align(obj, iters, layOnSide);
        if (!ok) return false;
        var lift = obj.getVariable && obj.getVariable('sgrZ');
        if (lift && isFinite(lift)) {
            var lifted = v3(obj.position.x, obj.position.y, obj.position.z + lift);
            obj.position = lifted;
            try {
                mp.game.entity.setCoordsNoOffset(obj.handle, lifted.x, lifted.y, lifted.z, false, false, false);
            } catch (e) {}
        }
        aligned.add(obj.handle);
        debugBox(obj);
        return true;
    },

    forget(obj) {
        if (obj && obj.handle) aligned.delete(obj.handle);
    },

    // Поворот уже выставлен сервером по нормали. Здесь только высота, без нового угла.
    settleOnly(obj, force) {
        if (!mp.objects.exists(obj) || !obj.handle) return false;
        if (!force && aligned.has(obj.handle)) return true;
        if (!settleZ(obj)) return false;
        aligned.add(obj.handle);
        return true;
    },
};

// Очередь, чтобы поле из сотен посевов не считалось в один кадр.
var queue = [];
var pumping = false;
var watch = [];
var MAX_PASSES = 4;

function sgrMode(entity) {
    if (!entity || entity.type !== 'object') return null;
    var mode = entity.getVariable('sgr');
    if (mode === null || typeof mode === 'undefined') return null;
    return mode;
}

function remember(entity, pass) {
    var pos = entity.position;
    for (var i = 0; i < watch.length; i++) {
        if (watch[i].entity === entity) {
            watch[i].x = pos.x;
            watch[i].y = pos.y;
            watch[i].z = pos.z;
            watch[i].pass = pass;
            return;
        }
    }
    watch.push({
        entity: entity,
        x: pos.x,
        y: pos.y,
        z: pos.z,
        pass: pass,
    });
}

function enqueue(entity, pass) {
    var mode = sgrMode(entity);
    if (mode === null) return;
    for (var i = 0; i < queue.length; i++) {
        if (queue[i].entity === entity) return;
    }
    queue.push({ entity: entity, attempt: 0, pass: pass || 0 });
    pump();
}

function finishLater(entity, mode, pass) {
    setTimeout(function () {
        if (!mp.objects.exists(entity) || !entity.handle) return;
        try {
            var ok = mode === 2 ? Sgr.settleOnly(entity, true) : Sgr.apply(entity, mode === 1, null, true);
            if (ok) remember(entity, pass);
        } catch (e) {}
    }, 300);
}

function attempt(job, done) {
    var entity = job.entity;
    if (!mp.objects.exists(entity) || !entity.handle) {
        if (job.attempt < 20) {
            job.attempt++;
            setTimeout(function () { attempt(job, done); }, 100);
            return;
        }
        done();
        return;
    }

    var pos = entity.position;
    mp.game.streaming.requestCollisionAtCoord(pos.x, pos.y, pos.z);
    if (entity.model && !mp.game.streaming.hasModelLoaded(entity.model)) {
        mp.game.streaming.requestModel(entity.model);
    }

    var mode = sgrMode(entity);
    var ok = false;
    try {
        ok = mode === 2 ? Sgr.settleOnly(entity) : Sgr.apply(entity, mode === 1);
    } catch (e) {
        ok = false;
    }

    if (!ok && job.attempt < 20) {
        job.attempt++;
        setTimeout(function () { attempt(job, done); }, 150);
        return;
    }

    if (ok) {
        remember(entity, job.pass);
        finishLater(entity, mode, job.pass);
    }
    done();
}

function pump() {
    if (pumping) return;
    var job = queue.shift();
    if (!job) return;
    pumping = true;
    attempt(job, function () {
        pumping = false;
        if (queue.length) setTimeout(pump, 30);
    });
}

mp.events.add('entityStreamIn', function (entity) {
    enqueue(entity, 0);
});

mp.events.addDataHandler('sgr', function (entity) {
    enqueue(entity, 0);
});

mp.events.addDataHandler('sgrZ', function (entity) {
    if (!entity || entity.type !== 'object') return;
    Sgr.forget(entity);
    enqueue(entity, 0);
});

mp.events.add('entityStreamOut', function (entity) {
    if (!entity || entity.type !== 'object') return;
    Sgr.forget(entity);
    for (var i = watch.length - 1; i >= 0; i--) {
        if (watch[i].entity === entity) watch.splice(i, 1);
    }
});

// Сервер двигает посевы по мере роста — выравниваем заново, пока объект в стриме.
setInterval(function () {
    for (var i = watch.length - 1; i >= 0; i--) {
        var item = watch[i];
        if (!mp.objects.exists(item.entity)) {
            watch.splice(i, 1);
            continue;
        }
        if (item.pass >= MAX_PASSES) continue;
        var pos = item.entity.position;
        var dx = pos.x - item.x;
        var dy = pos.y - item.y;
        var dz = pos.z - item.z;
        if (dx * dx + dy * dy + dz * dz < 0.04) continue;
        Sgr.forget(item.entity);
        var pass = item.pass + 1;
        watch.splice(i, 1);
        enqueue(item.entity, pass);
    }
}, 1000);

mp.sgr = Sgr;
