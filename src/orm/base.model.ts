import { Document, ObjectId } from 'mongoose';

/**
 * @dev Base model for all models.
 * @export
 * @class BaseModel
 * @extends {Document}
 * @template T
 */
export class BaseModel extends Document {
  _id: ObjectId;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
