export interface ClubItem {
  price: number;
  params: { name: string; alcohol?: number; satiety?: number; count?: number };
}

export const CLUB_ALCOHOL: Record<number, ClubItem[]> = {
  13: [
    { price: 390, params: { name: 'Мохито', alcohol: 30 } },
    { price: 400, params: { name: 'Апероль Шпритц', alcohol: 35 } },
    { price: 395, params: { name: 'Негрони', alcohol: 40 } },
    { price: 410, params: { name: 'Мартини & Тоник', alcohol: 25 } },
    { price: 415, params: { name: 'Бьянко Санрайз', alcohol: 45 } },
    { price: 385, params: { name: 'Валентино', alcohol: 30 } },
  ],
  14: [
    { price: 390, params: { name: 'Амиго', alcohol: 40 } },
    { price: 415, params: { name: 'Эль-бандито', alcohol: 45 } },
    { price: 395, params: { name: 'Маргарита', alcohol: 30 } },
    { price: 410, params: { name: 'Пина-колада', alcohol: 25 } },
    { price: 385, params: { name: 'Сангрита', alcohol: 30 } },
    { price: 400, params: { name: 'Палома', alcohol: 35 } },
  ],
  12: [
    { price: 395, params: { name: 'Отвёртка', alcohol: 40 } },
    { price: 385, params: { name: 'Холодное лето 1986 года', alcohol: 30 } },
    { price: 400, params: { name: 'Российский флаг', alcohol: 45 } },
    { price: 390, params: { name: 'Балалайка', alcohol: 25 } },
    { price: 415, params: { name: 'Кровавая мэри', alcohol: 35 } },
    { price: 410, params: { name: 'Белый туман', alcohol: 30 } },
  ],
};

export const CLUB_SNACKS: Record<number, ClubItem[]> = {
  13: [
    { price: 420, params: { name: 'Брускетта с помидорами', satiety: 55 } },
    { price: 340, params: { name: 'Аранчини', satiety: 50 } },
    { price: 450, params: { name: 'Моцарелла с базаликом', satiety: 60 } },
    { price: 650, params: { name: 'Креветки в соусе песто', satiety: 70 } },
  ],
  14: [
    { price: 450, params: { name: 'Кесадилья с курицей', satiety: 60 } },
    { price: 420, params: { name: 'Сэндвич с каперсами', satiety: 55 } },
    { price: 650, params: { name: 'Бурритос с курицей', satiety: 70 } },
    { price: 340, params: { name: 'Гуакамоле с грушей', satiety: 50 } },
  ],
  12: [
    { price: 420, params: { name: 'Селёдка с солёным огурцом', satiety: 55 } },
    { price: 450, params: { name: 'Рулетики из ветчины с сыром', satiety: 60 } },
    { price: 340, params: { name: 'Бутерброд со шпротами', satiety: 50 } },
    { price: 650, params: { name: 'Шаурма в пите', satiety: 70 } },
  ],
};

export const CLUB_SMOKE: Record<number, ClubItem[]> = {
  13: [{ price: 630, params: { name: 'Arturo Fuente', count: 20 } }],
  14: [{ price: 630, params: { name: 'Te Amo', count: 20 } }],
  12: [{ price: 630, params: { name: 'Погарские', count: 20 } }],
};
