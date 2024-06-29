import { GuildMember } from "discord.js";

export class MemberRoles {
    public rolesToAdd: { id: string, reason: string }[] = [];
    public rolesToRemove: { id: string, reason: string }[] = [];
    public memberRoles: Set<string>;
    constructor(public member: GuildMember) {
        this.memberRoles = new Set([...member.roles.cache.keys()]);
    }
    public addRole(rolesToAdd?: string | string[], reason?: string) {
        const roles = Array.isArray(rolesToAdd) ? rolesToAdd : [rolesToAdd];
        roles.forEach(role => {
            if (role && !this.memberRoles.has(role)) {
                console.log(`ADD ROLE: ${role}`, this.memberRoles)
                this.memberRoles.add(role);
                this.rolesToAdd.push({ id: role, reason: reason ?? "No reason provided" });
                this.rolesToRemove = this.rolesToRemove.filter(e => e.id !== role);
            }
        })
    }
    public removeRole(rolesToRemove?: string | string[], reason?: string) {
        const roles = Array.isArray(rolesToRemove) ? rolesToRemove : [rolesToRemove];
        roles.forEach(role => {
            if (role && this.memberRoles.has(role)) {
                console.log(`REMOVE ROLE: ${role}`)
                this.memberRoles.delete(role);
                this.rolesToRemove.push({ id: role, reason: reason ?? "No reason provided" });
                this.rolesToAdd = this.rolesToAdd.filter(e => e.id !== role);
            }
        })
    }
    public array() {
        return [...this.memberRoles.keys()];
    }
    public async set() {
        if (this.rolesToAdd.length || this.rolesToRemove.length) {
            const roles = this.array();
            // console.log('actually setting sroles...')
            await this.member.roles.set(roles).catch(e => console.log(`ERROR WHILE SETTING ROLES ?!?!?!`, e));
            return roles;
        }
        return null;
    }
}