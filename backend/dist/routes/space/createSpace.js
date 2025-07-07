"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const express_1 = require("express");
const authMiddlware_1 = __importDefault(require("../../middleware/authMiddlware"));
const uuid_1 = require("uuid");
var SpaceMemberRole;
(function (SpaceMemberRole) {
    SpaceMemberRole[SpaceMemberRole["OWNER"] = 0] = "OWNER";
    SpaceMemberRole[SpaceMemberRole["ADMIN"] = 1] = "ADMIN";
    SpaceMemberRole[SpaceMemberRole["MEMBER"] = 2] = "MEMBER";
})(SpaceMemberRole || (SpaceMemberRole = {}));
const route = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
route.post('/create-space', authMiddlware_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, description, maxMembers, } = req.body;
    if (!name) {
        return res.status(401).json({ Error: "Enter space Name" });
    }
    if (!req.user || !req.user.id) { // getUserId
        return res.status(401).json({ error: "Unauthorized" });
    }
    const currentUserId = req.user.id;
    const spaceId = (0, uuid_1.v4)();
    try {
        const newSpace = yield prisma.space.create({
            data: {
                id: spaceId,
                name: name,
                description: description,
                maxMembers: maxMembers,
                createdById: currentUserId
            }
        });
        console.log("New Space Created : ", newSpace);
        // getting issue while joing in the room 
        // const spcaeMember = await prisma.spaceMember.create({
        //     data : {
        //         id : uuidv4(),
        //         userId : currentUserId,
        //         spaceId : newSpace.id,
        //         role : "OWNER"
        //     }
        // })
        // console.log("Enrolled in SpaceMemeber " , spcaeMember)
        return res.status(200).json({ mssg: "New Space created successfully" });
    }
    catch (error) {
        console.log("Error : ", error);
        return res.status(500).json({ Msgg: "Error while inserting data in DB", error });
    }
}));
exports.default = route;
