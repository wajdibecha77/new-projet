import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
    name: "userPipe",
    pure: false,
})
export class UserPipe implements PipeTransform {
    transform(items: any, filter: any): any {
        console.log(filter, items);
        if (items && items.length > 0) {
            return items.filter((item) => {
                return (
                    item.name
                        .toLowerCase()
                        .includes(filter.name.toLowerCase()) &&
                    item.role.toLowerCase().includes(filter.role.toLowerCase())
                );
            });
        }
    }
}
