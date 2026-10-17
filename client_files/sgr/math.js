// SGR — Safe Ground Raycast
// MIT License, Copyright (c) 2026 ounezz
// https://github.com/ounezz/safegroundraycast

var MathS = {
    v3(x, y, z) {
        return { x: x || 0, y: y || 0, z: z || 0 };
    },

    add3(a, b) {
        return this.v3(a.x + b.x, a.y + b.y, a.z + b.z);
    },

    sub3(a, b) {
        return this.v3(a.x - b.x, a.y - b.y, a.z - b.z);
    },

    mul3(a, s) {
        return this.v3(a.x * s, a.y * s, a.z * s);
    },

    dot3(a, b) {
        return a.x * b.x + a.y * b.y + a.z * b.z;
    },

    cross3(a, b) {
        return this.v3(
            a.y * b.z - a.z * b.y,
            a.z * b.x - a.x * b.z,
            a.x * b.y - a.y * b.x
        );
    },

    len3(a) {
        return Math.sqrt(this.dot3(a, a));
    },

    norm3(a) {
        var l = this.len3(a);
        return l > 1e-8 ? this.mul3(a, 1 / l) : this.v3(0, 0, 1);
    },

    deg2rad(d) {
        return (d * Math.PI) / 180;
    },

    quat_make(x, y, z, w) {
        return {
            x: x || 0,
            y: y || 0,
            z: z || 0,
            w: w == null ? 1 : w,
        };
    },

    quat_norm(q) {
        var l = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w) || 1;
        return { x: q.x / l, y: q.y / l, z: q.z / l, w: q.w / l };
    },

    quat_mul(a, b) {
        return this.quat_make(
            a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
            a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
            a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
            a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z
        );
    },

    quat_axis_angle(axis, deg) {
        var ang = this.deg2rad(deg) * 0.5;
        var s = Math.sin(ang);
        var a = this.norm3(axis);
        return this.quat_norm({
            x: a.x * s,
            y: a.y * s,
            z: a.z * s,
            w: Math.cos(ang),
        });
    },

    mat3_to_quat(r, f, u) {
        var m00 = r.x;
        var m01 = f.x;
        var m02 = u.x;
        var m10 = r.y;
        var m11 = f.y;
        var m12 = u.y;
        var m20 = r.z;
        var m21 = f.z;
        var m22 = u.z;

        var tr = m00 + m11 + m22;
        var w = 1;
        var x = 0;
        var y = 0;
        var z = 0;
        var s;

        if (tr > 0) {
            s = Math.sqrt(tr + 1.0) * 2;
            w = 0.25 * s;
            x = (m21 - m12) / s;
            y = (m02 - m20) / s;
            z = (m10 - m01) / s;
        } else if (m00 > m11 && m00 > m22) {
            s = Math.sqrt(1.0 + m00 - m11 - m22) * 2;
            w = (m21 - m12) / s;
            x = 0.25 * s;
            y = (m01 + m10) / s;
            z = (m02 + m20) / s;
        } else if (m11 > m22) {
            s = Math.sqrt(1.0 + m11 - m00 - m22) * 2;
            w = (m02 - m20) / s;
            x = (m01 + m10) / s;
            y = 0.25 * s;
            z = (m12 + m21) / s;
        } else {
            s = Math.sqrt(1.0 + m22 - m00 - m11) * 2;
            w = (m10 - m01) / s;
            x = (m02 + m20) / s;
            y = (m12 + m21) / s;
            z = 0.25 * s;
        }

        return this.quat_norm({ x: x, y: y, z: z, w: w });
    },

    fit_plane_normal(pts) {
        if (pts.length < 3) return null;

        var sxx = 0;
        var sxy = 0;
        var sx = 0;
        var syy = 0;
        var sy = 0;
        var sxz = 0;
        var syz = 0;
        var sz = 0;
        var n = pts.length;
        var i;

        for (i = 0; i < n; i++) {
            var p = pts[i];
            sxx += p.x * p.x;
            sxy += p.x * p.y;
            sx += p.x;
            syy += p.y * p.y;
            sy += p.y;
            sxz += p.x * p.z;
            syz += p.y * p.z;
            sz += p.z;
        }

        var a00 = sxx;
        var a01 = sxy;
        var a02 = sx;
        var a10 = sxy;
        var a11 = syy;
        var a12 = sy;
        var a20 = sx;
        var a21 = sy;
        var a22 = n;

        var b0 = sxz;
        var b1 = syz;
        var b2 = sz;

        var det =
            a00 * (a11 * a22 - a12 * a21) -
            a01 * (a10 * a22 - a12 * a20) +
            a02 * (a10 * a21 - a11 * a20);

        if (Math.abs(det) < 1e-10) return null;

        var det0 =
            b0 * (a11 * a22 - a12 * a21) -
            a01 * (b1 * a22 - a12 * b2) +
            a02 * (b1 * a21 - a11 * b2);

        var det1 =
            a00 * (b1 * a22 - a12 * b2) -
            b0 * (a10 * a22 - a12 * a20) +
            a02 * (a10 * b2 - b1 * a20);

        var aa = det0 / det;
        var bb = det1 / det;

        return this.norm3(this.v3(-aa, -bb, 1));
    },
};

exports = MathS;
