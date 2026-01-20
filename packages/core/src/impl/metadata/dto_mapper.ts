// import { DtoField } from "./dto";
// import { Entity } from "./entity";
// import { EntityProp } from "./entity_prop";

// export class Context {

//     private mapper: Mapper;

//     constructor(entity: Entity) {
//         this.mapper = new Mapper(entity, undefined);
//     }

//     addField(field: )
// }

// export class Mapper {

//     private fieldMap = new Map<string, MapperField>();

//     constructor(
//         readonly entity: Entity,
//         readonly associatedProp: EntityProp | undefined
//     ) {}

//     field(dtoField: DtoField) {
//         let field = this.fieldMap.get(dtoField.entityProp.name);
//         if (field != null) {
//             return field;
//         }
//         field = new MapperField(dtoField.entityProp);
//         this.fieldMap.set(dtoField.entityProp.name, field);
//         return field;
//     }
// };

// export class MapperField {

//     constructor(
//         readonly prop: EntityProp
//     ) {

//     }
// }