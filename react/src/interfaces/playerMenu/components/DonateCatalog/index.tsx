import React, { memo } from 'react';
import styles from './index.module.css';
import { buyDonateBundle, buyDonateLicense, showConfirmWindow, usePlayerMenuStore } from '../../store';

function DonateCatalog(props: { kind: 'licenses' | 'bundles' }) {
	const windowId = props.kind === 'licenses' ? 'donate-licenses' : 'donate-bundles';
	const active = usePlayerMenuStore(state => state.donateWindow === windowId);
	const items = usePlayerMenuStore(state => props.kind === 'licenses' ? state.donateLicenses : state.donateBundles);
	const licenses = usePlayerMenuStore(state => state.licenses);
	const coins = usePlayerMenuStore(state => state.coins);
	const isLicense = props.kind === 'licenses';
	const className = active ? styles.root : styles.root + ' ' + styles.hidden;

	function buy(item: any) {
		if (isLicense && licenses[item.key]) return;
		if (coins < item.donatePrice && isLicense) return;
		if (coins < item.price && !isLicense) return;
		const price = isLicense ? item.donatePrice : item.price;
		const title = isLicense ? `купить лицензию «${item.name}»` : `купить набор «${item.name}»`;
		showConfirmWindow(
			'Подтверждение покупки',
			`Вы действительно хотите ${title} за <span style="color:#FFDF29">${price} CC</span>?`,
			function () {
				if (isLicense) buyDonateLicense(item.key);
				else buyDonateBundle(item.id);
			},
		);
	}

	return (
		<div className={className}>
			<div className={styles.head}>{isLicense ? 'Лицензии за донат-валюту' : 'Готовые донат-наборы'}</div>
			<div className={styles.description}>
				{isLicense
					? 'Цена рассчитывается по текущей стоимости лицензии в департаменте лицензирования: $100 = 1 CC, дробная стоимость округляется вверх.'
					: 'В каждом наборе — автомобиль, наличные и указанные водительские лицензии. Автомобиль доставляется на парковку.'}
			</div>
			<div className={styles.list}>
				{items.map((item: any) => {
					const bought = isLicense && !!licenses[item.key];
					const price = isLicense ? item.donatePrice : item.price;
					const disabled = bought || coins < price;
					return (
						<div className={styles.item} key={isLicense ? item.key : item.id}>
							<div>
								<strong>{item.name}</strong>
								<p>{isLicense
									? `Стоимость в департаменте: $${item.cashPrice}`
									: `${item.description} Модель: ${item.modelName}; наличные: $${item.cash}.`}
								</p>
								{!isLicense ? <small>Лицензии: {item.licenses.join(', ')}</small> : null}
							</div>
							<div className={styles.buyArea}>
								<span>{price} CC</span>
								<button disabled={disabled} onClick={function () { buy(item); }}>
									{bought ? 'Уже есть' : coins < price ? 'Недостаточно CC' : 'Купить'}
								</button>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

export default memo(DonateCatalog);
