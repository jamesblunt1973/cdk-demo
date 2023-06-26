import { Handler } from 'aws-lambda';
import { DynamoDB } from 'aws-sdk';
import * as crypto from 'crypto';
import { Todo } from './todo';

const dynamo = new DynamoDB.DocumentClient();
const TABLE_NAME: string = process.env.TODOS_TABLE_NAME!;

export const handler: Handler = async (event, context) => {
	try {
		const httpMethod = event.requestContext.http.method;
		const data: Todo = event.body ? JSON.parse(event.body) : undefined;
		const queryId = event.queryStringParameters?.id;

		switch (httpMethod) {
			case 'GET':
				if (queryId) {
					const response = await getTodo(queryId);
					return createResponse(response?.Item || {});
				}
				const response = await getAllTodos();
				return createResponse(response?.Items || []);
			case 'POST':
				if (!data) {
					return createResponse('Todo data is missing', 500);
				}
				const todo = await addTodoItem({ ...data, isDone: false });
				return createResponse(`${todo.title} added to the database`);
			case 'DELETE':
				if (!data) {
					return createResponse('Id is missing', 500);
				}
				const id = await deleteTodoItem(data);
				return id
					? createResponse(
						`Todo item with id of ${id} deleted from the database`
					)
					: createResponse("ID is missing", 500);
			case 'PATCH':
				if (!data) {
					return createResponse('Todo data is missing', 500);
				}
				if (data.id !== queryId) {
					return createResponse(`Query id mismatch`, 500);
				}
				await updateTodoItem(queryId, data);
				return createResponse(`Todo item with id of ${queryId} has been updated`);

			default:
				return createResponse(
					`We only accept GET requests for now, not ${httpMethod}`,
					500
				);
		}
	} catch (error: unknown) {
		console.log(error);
		return createResponse(error, 500);
	}
};

const getTodo = async (id: string) => {
	const getResult = await dynamo.get({
		TableName: TABLE_NAME,
		Key: { id }
	}).promise();

	return getResult;
}

const getAllTodos = async () => {
	const scanResult = await dynamo.scan({
		TableName: TABLE_NAME
	}).promise();

	return scanResult;
};

const addTodoItem = async (data: Todo): Promise<Todo> => {
	const uuid = crypto.randomUUID();
	const todo = { ...data, id: uuid };
	await dynamo.put({
		TableName: TABLE_NAME,
		Item: todo
	}).promise();

	return todo;
};

const updateTodoItem = async (id: string, data: Todo) => {
	await dynamo.update({
		TableName: TABLE_NAME,
		Key: { id },
		UpdateExpression: 'set isDone = :isdone, title = :title, description = :desc',
		ExpressionAttributeValues: {
			':isdone': data.isDone,
			':title': data.title,
			':desc': data.description
		}
	}).promise();
}

const deleteTodoItem = async (data: Todo) => {
	const { id } = data;
	if (id && id !== '') {
		await dynamo.delete({
			TableName: TABLE_NAME,
			Key: { id }
		}).promise();
	}
	return id;
};

const createResponse = (
	body: any,
	statusCode = 200) => {
	return {
		statusCode,
		headers: {
			'content-type': 'application/json',
		},
		body: JSON.stringify(body, null, 2)
	};
};