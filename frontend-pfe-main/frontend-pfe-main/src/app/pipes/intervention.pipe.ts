import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
    name: "interPipe",
    pure: false,
})
export class InterventionPipe implements PipeTransform {
    transform(items: any, filter: any): any {
        if (!items || items.length === 0) {
            return [];
        }

        return items.filter((item) => {
            const name = String(item?.name || "").toLowerCase();
            const lieu = String(item?.lieu || "").toLowerCase();
            const etat = String(item?.etat || "").toLowerCase();
            const createdByName = String(item?.createdBy?.name || "").toLowerCase();

            return (
                name.includes(String(filter?.name || "").toLowerCase()) &&
                lieu.includes(String(filter?.lieu || "").toLowerCase()) &&
                etat.includes(String(filter?.etat || "").toLowerCase()) &&
                createdByName.includes(String(filter?.createdBy || "").toLowerCase())
            );
        });
    }
}
