export interface Contact {
    name: string;
    number: string;
}

export interface Improvement {
    name?: string;
    price?: number;
    isBuyed?: boolean;
    type?: string;
}

export interface HouseProperty {
    name?: any;
    area?: string;
    class?: string;
    numRooms?: number;
    garage?: boolean;
    carPlaces?: number;
    rent?: number;
    price?: number;
    isOpened?: boolean;
    days?: number;
    improvements?: Improvement[];
    sellStatus?: any;
    ansSell?: any;
    buyStatus?: any;
}

export interface BusinessOrder {
    productsCount: number;
    productsPrice: number;
    isTake?: boolean;
}

export interface BusinessDay {
    date: any;
    money: number;
}

export interface BusinessProperty {
    id?: any;
    name?: string;
    type?: string;
    cashBox?: number;
    area?: string;
    days?: number;
    rent?: number;
    resourcesMax?: number;
    resources?: number;
    resourcePriceMin?: number;
    resourcePriceMax?: number;
    price?: number;
    improvements?: Improvement[];
    statistics?: BusinessDay[];
    order?: BusinessOrder | null;
    orderStatus?: any;
    sellStatus?: any;
    ansSell?: any;
    buyStatus?: any;
}

export interface PhoneInfo {
    name?: string;
    number?: string;
    isDriver?: boolean;
    isHave?: boolean;
    isLoad?: boolean;
    isDisabled?: boolean;
    isCall?: boolean;
    symbolPriceNews?: number;
    contacts?: Contact[];
    houses?: HouseProperty[];
    biz?: BusinessProperty[];
    factionBiz?: BusinessProperty | null;
    incomingCall?: { state: boolean; number?: string } | null;
    activeCall?: {
        state?: boolean;
        number?: string;
        isMine?: boolean;
        callStatus?: number;
    };
    [key: string]: any;
}

export interface HouseData {
    isLoading?: boolean;
    isBlur?: boolean;
    answerBuy?: any;
    answerEnter?: any;
    owner?: string;
    garage?: boolean;
    [key: string]: any;
}

export interface EnterMenuData {
    isShow: boolean;
    place: any;
}

export interface BusinessData {
    isLoading?: boolean;
    isBlur?: boolean;
    answerBuy?: any;
    owner?: string;
    actions?: any;
    faction?: string;
    [key: string]: any;
}

export interface BankData {
    isLoading?: boolean;
    cash?: number;
    money?: number;
    phoneMoney?: number;
    answer?: any;
    type?: any;
    args?: any;
    askAnswer?: any;
    houses?: HouseProperty[];
    biz?: BusinessProperty[];
    [key: string]: any;
}

export interface Player {
    id: any;
    name: string;
    faction?: string;
    ping?: number;
    [key: string]: any;
}

export interface ChatWord {
    text: string;
    color: string;
}

export interface ChatMessage {
    text: ChatWord[];
    time: string;
}

export interface ChatTag {
    id: any;
    name: string;
    color?: string;
}

export interface PhoneMessage {
    text: string;
    date?: any;
    isMine?: boolean;
    isRead?: boolean;
}

export interface PhoneDialog {
    name: string;
    number: string;
    PhoneMessages: PhoneMessage[];
}
