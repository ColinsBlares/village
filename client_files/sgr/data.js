// SGR — Safe Ground Raycast
// MIT License, Copyright (c) 2026 ounezz
// https://github.com/ounezz/safegroundraycast

exports = {
    cfg: {
        debug: {
            lines: false,
            box: false,
        },
        iters: 5,
        // В проекте объекты стоят вертикально. На бок кладём только по флагу sgr = 1.
        lay_on_side: false,
        eps: 0.02,
        // Луч короткий и начинается чуть выше точки: в комнате длинный луч сверху
        // попадает в потолок и поднимает проп на крышу.
        z_hint: 0.8,
        min_samples: 3,
        // Больше этого сдвига по Z не делаем: в интерьере луч может промахнуться
        // и утянуть проп на улицу под зданием.
        max_shift: 8.0,
        ray: {
            up: 0.2,
            down: 8.0,
            flags: 17,
        },
    },
    edges: [
        [0, 1],
        [1, 3],
        [3, 2],
        [2, 0],
        [4, 5],
        [5, 7],
        [7, 6],
        [6, 4],
        [0, 4],
        [1, 5],
        [2, 6],
        [3, 7],
    ],
};
