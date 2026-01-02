import { InferSelectModel } from "drizzle-orm";
import { accounts } from "@/db/schema";

export type Account = InferSelectModel<typeof accounts>;

export type AccountWithChildren = Account & {
    children?: AccountWithChildren[];
};
