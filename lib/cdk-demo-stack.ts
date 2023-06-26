import { Construct } from 'constructs';
import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';

import { AttributeType, Table } from 'aws-cdk-lib/aws-dynamodb';
import {Runtime, FunctionUrlAuthType } from 'aws-cdk-lib/aws-lambda';
import {NodejsFunction} from 'aws-cdk-lib/aws-lambda-nodejs'
import * as path from 'path';

export class CdkDemoStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    //Dynamodb table definition
    const table = new Table(this, 'Todos', {
      partitionKey: { name: 'id', type: AttributeType.STRING },
    });

    // lambda function
    const dynamoLambda = new NodejsFunction(this, 'GetTodosLambdaHandler', {
      runtime: Runtime.NODEJS_16_X,
      entry: 'lib/lambda.ts',
      handler: 'handler',
      environment: {
        TODOS_TABLE_NAME: table.tableName,
      },
    });

    // permissions to lambda to dynamo table
    table.grantReadWriteData(dynamoLambda);

    const myFunctionUrl = dynamoLambda.addFunctionUrl({
      authType: FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins: ['*'],
      }
    });

    new CfnOutput(this, 'GetTodosFunctionUrl', {
      value: myFunctionUrl.url,
    });
  }
}
