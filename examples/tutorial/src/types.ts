export interface Note {
    id: string;
    title: string;
    body: string;
    createdAt: Date;
}

export interface Category {
    id: string;
    title: string;
    icon: string;
}
