import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
    name: "userPipe",
    pure: false,
})
export class UserPipe implements PipeTransform {
    transform(value: any, filter?: any): any {
        if (Array.isArray(value)) {
            const nameFilter = String(filter?.name || "").toLowerCase();
            const roleFilter = String(filter?.role || "").toLowerCase();

            return value.filter((item: any) => {
                if (!item) return false;

                const name = String(item?.name || "").toLowerCase();
                const role = String(item?.role || "").toLowerCase();

                return (
                    name.includes(nameFilter) &&
                    role.includes(roleFilter)
                );
            });
        }

        if (!value || !value.role) {
            return "";
        }

        return String(value.role).toLowerCase();
    }
}
