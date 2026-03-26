export interface Note {
    id: string;
    title: string;
    body: string;
    createdAt: Date;
    favorite?: boolean;
    deleted?: boolean;
}

export interface Category {
    id: string;
    title: string;
    icon: string;
}
