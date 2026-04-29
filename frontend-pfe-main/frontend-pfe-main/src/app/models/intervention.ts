export class Intervention {
    public name: string;
    public type?: string;
    public delai: Date;
    public lieu: string;
    public description: string;
    public degree: string;
    public createdBy: string;
    public isAI?: boolean;
    public aiDetails?: string;
    public refusCommentaire?: string;
    public refusType?: "COMPETENCE" | "CHARGE" | "MATERIEL" | "AUTRE";
}
