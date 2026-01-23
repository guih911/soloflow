/**
 * Script para testar a conexão com o Cloudflare R2
 * Execute com: npx ts-node test-r2.ts
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Carregar variáveis de ambiente
dotenv.config({ path: resolve(__dirname, '.env') });

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME;

console.log('🔧 Configuração R2:');
console.log(`   Account ID: ${accountId}`);
console.log(`   Bucket: ${bucketName}`);
console.log(`   Access Key: ${accessKeyId?.substring(0, 8)}...`);
console.log('');

if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
  console.error('❌ Variáveis de ambiente do R2 não configuradas!');
  process.exit(1);
}

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

async function testR2Connection() {
  const testKey = `test/test-file-${Date.now()}.txt`;
  const testContent = `Teste de conexão R2 - ${new Date().toISOString()}`;

  try {
    // 1. Testar upload
    console.log('📤 Testando upload...');
    await s3Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: testKey,
      Body: testContent,
      ContentType: 'text/plain',
    }));
    console.log('✅ Upload realizado com sucesso!');

    // 2. Testar listagem
    console.log('📋 Listando objetos no bucket...');
    const listResponse = await s3Client.send(new ListObjectsV2Command({
      Bucket: bucketName,
      MaxKeys: 10,
    }));
    console.log(`✅ Objetos encontrados: ${listResponse.Contents?.length || 0}`);
    listResponse.Contents?.forEach(obj => {
      console.log(`   - ${obj.Key} (${obj.Size} bytes)`);
    });

    // 3. Testar download
    console.log('📥 Testando download...');
    const getResponse = await s3Client.send(new GetObjectCommand({
      Bucket: bucketName,
      Key: testKey,
    }));
    const downloadedContent = await getResponse.Body?.transformToString();
    console.log(`✅ Download realizado! Conteúdo: "${downloadedContent}"`);

    // 4. Testar delete
    console.log('🗑️  Testando delete...');
    await s3Client.send(new DeleteObjectCommand({
      Bucket: bucketName,
      Key: testKey,
    }));
    console.log('✅ Delete realizado com sucesso!');

    console.log('');
    console.log('🎉 Todos os testes passaram! O R2 está funcionando corretamente.');

  } catch (error: any) {
    console.error('');
    console.error('❌ Erro ao testar R2:', error.message);
    if (error.Code) {
      console.error(`   Código: ${error.Code}`);
    }
    if (error.$metadata) {
      console.error(`   HTTP Status: ${error.$metadata.httpStatusCode}`);
    }
    process.exit(1);
  }
}

testR2Connection();
