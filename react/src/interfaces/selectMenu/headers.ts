import ammunation from '@imgs/selectMenu/headers/ammunation.png';
import beachcombover from '@imgs/selectMenu/headers/beachcombover.png';
import binco from '@imgs/selectMenu/headers/binco.png';
import bishop from '@imgs/selectMenu/headers/bishop.png';
import blazing from '@imgs/selectMenu/headers/blazing.png';
import bobmullet from '@imgs/selectMenu/headers/bobmullet.png';
import bodyart from '@imgs/selectMenu/headers/bodyart.png';
import burger from '@imgs/selectMenu/headers/burger.png';
import chihua from '@imgs/selectMenu/headers/chihua.png';
import cluckin from '@imgs/selectMenu/headers/cluckin.png';
import discount from '@imgs/selectMenu/headers/discount.png';
import haironhawick from '@imgs/selectMenu/headers/haironhawick.png';
import herrkutz from '@imgs/selectMenu/headers/herrkutz.png';
import hornys from '@imgs/selectMenu/headers/hornys.png';
import inkinc from '@imgs/selectMenu/headers/inkinc.png';
import lsc from '@imgs/selectMenu/headers/lsc.png';
import lstattoos from '@imgs/selectMenu/headers/lstattoos.png';
import ltd from '@imgs/selectMenu/headers/ltd.png';
import masks from '@imgs/selectMenu/headers/masks.png';
import osheas from '@imgs/selectMenu/headers/osheas.png';
import ponsonbys from '@imgs/selectMenu/headers/ponsonbys.png';
import robsliquor from '@imgs/selectMenu/headers/robsliquor.png';
import suburban from '@imgs/selectMenu/headers/suburban.png';
import supermarket from '@imgs/selectMenu/headers/supermarket.png';
import taco from '@imgs/selectMenu/headers/taco.png';
import thepit from '@imgs/selectMenu/headers/thepit.png';
import upnatom from '@imgs/selectMenu/headers/upnatom.png';

const headers: { [name: string]: string } = {
	'ammunation.png': ammunation,
	'beachcombover.png': beachcombover,
	'binco.png': binco,
	'bishop.png': bishop,
	'blazing.png': blazing,
	'bobmullet.png': bobmullet,
	'bodyart.png': bodyart,
	'burger.png': burger,
	'chihua.png': chihua,
	'cluckin.png': cluckin,
	'discount.png': discount,
	'haironhawick.png': haironhawick,
	'herrkutz.png': herrkutz,
	'hornys.png': hornys,
	'inkinc.png': inkinc,
	'lsc.png': lsc,
	'lstattoos.png': lstattoos,
	'ltd.png': ltd,
	'masks.png': masks,
	'osheas.png': osheas,
	'ponsonbys.png': ponsonbys,
	'robsliquor.png': robsliquor,
	'suburban.png': suburban,
	'supermarket.png': supermarket,
	'taco.png': taco,
	'thepit.png': thepit,
	'upnatom.png': upnatom,
};

export function headerImage(name: string): string {
	if (!name) return '';
	if (headers[name]) return headers[name];
	const parts = String(name).split('/');
	const file = parts[parts.length - 1];
	return headers[file] || '';
}
