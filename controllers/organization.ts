import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Organization } from '../models';
// import { User as UserEntity } from '../models/user'; // 確保引入 UserEntity 以便關聯
import { handleErrorAsync, ApiError } from '../utils';
import {
  ApiResponse,
  CreateOrganizationRequest,
  OrganizationResponse,
  OrganizationData,
  OrganizationsResponse, // 雖然創建時不用，但先引入
  ErrorCode
} from '../types';
import { Not } from 'typeorm';

// 獲取當前用戶擁有的所有組織
export const getAllOrganizations = handleErrorAsync(async (req: Request, res: Response<OrganizationsResponse>) => {
  const authenticatedUser = req.user as { userId: string; };
  if (!authenticatedUser || !authenticatedUser.userId) {
    throw ApiError.unauthorized();
  }
  const userId = authenticatedUser.userId;

  const organizations = await AppDataSource.getRepository(Organization).find({
    where: { userId: userId }, // 只查找屬於當前用戶的組織
    order: {
      createdAt: 'DESC' 
    }
  });
  
  res.status(200).json({ 
    status: 'success',
    message: '獲取您的組織列表成功',
    data: { organizations: organizations as OrganizationData[] } 
    // TODO: 將來可以加入分頁邏輯
  }); 
});

// 獲取單個組織 (需要是擁有者)
export const getOrganizationById = handleErrorAsync(async (req: Request, res: Response<OrganizationResponse>) => {
  const authenticatedUser = req.user as { userId: string; };
  if (!authenticatedUser || !authenticatedUser.userId) {
    throw ApiError.unauthorized();
  }
  const userId = authenticatedUser.userId;
  const { organizationId } = req.params;

  const organizationRepository = AppDataSource.getRepository(Organization);
  const organization = await organizationRepository.findOne({ where: { organizationId } });

  if (!organization) {
    throw ApiError.notFound('組織');
  }

  // 權限檢查：確保請求者是組織的擁有者
  if (organization.userId !== userId) {
    throw ApiError.forbidden();
  }

  res.status(200).json({ 
    status: 'success',
    message: '獲取組織成功',
    data: { organization: organization as OrganizationData }
  });
});

// 創建組織
export const createOrganization = handleErrorAsync(async (req: Request, res: Response<OrganizationResponse>) => {
  // 獲取當前用戶的 userId
  const authenticatedUser = req.user as { userId: string; }; // 來自 isAuthenticated
  if (!authenticatedUser || !authenticatedUser.userId) {
    // 理論上 isAuthenticated 會處理，但以防萬一
    throw ApiError.unauthorized(); 
  }
  const userId = authenticatedUser.userId;

  const { 
    orgName, 
    orgAddress, 
    orgMail, 
    orgContact, 
    orgMobile, 
    orgPhone, 
    orgWebsite 
  } = req.body as CreateOrganizationRequest;

  // --- 基本驗證 --- 
  const fieldErrors: Record<string, { code: string; message: string }> = {};
  if (!orgName || orgName.trim() === '') {
    fieldErrors.orgName = { code: ErrorCode.VALIDATION_FAILED, message: '組織名稱為必填欄位' };
  } else if (orgName.length > 100) {
    fieldErrors.orgName = { code: ErrorCode.VALIDATION_FAILED, message: '組織名稱長度不能超過 100 個字' };
  }
  if (!orgAddress || orgAddress.trim() === '') {
    fieldErrors.orgAddress = { code: ErrorCode.VALIDATION_FAILED, message: '組織地址為必填欄位' };
  } else if (orgAddress.length > 100) {
    fieldErrors.orgAddress = { code: ErrorCode.VALIDATION_FAILED, message: '組織地址長度不能超過 100 個字' };
  }
  if (orgMail && orgMail.length > 100) {
     fieldErrors.orgMail = { code: ErrorCode.VALIDATION_FAILED, message: '組織信箱長度不能超過 100 個字' };
  }
  if (orgContact && orgContact.length > 1000) {
     fieldErrors.orgContact = { code: ErrorCode.VALIDATION_FAILED, message: '組織聯絡方式長度不能超過 1000 個字' };
  }
  if (orgMobile && orgMobile.length > 200) {
     fieldErrors.orgMobile = { code: ErrorCode.VALIDATION_FAILED, message: '組織手機長度不能超過 200 個字' };
  }
  if (orgPhone && orgPhone.length > 200) {
     fieldErrors.orgPhone = { code: ErrorCode.VALIDATION_FAILED, message: '組織電話長度不能超過 200 個字' };
  }
  if (orgWebsite && orgWebsite.length > 200) {
     fieldErrors.orgWebsite = { code: ErrorCode.VALIDATION_FAILED, message: '組織網站長度不能超過 200 個字' };
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw ApiError.validation('資料驗證失敗', fieldErrors);
  }
  // --- 驗證結束 --- 

  const organizationRepository = AppDataSource.getRepository(Organization);

  // 檢查名稱是否重複
  const existingOrg = await organizationRepository.findOne({ where: { orgName } });
  if (existingOrg) {
    throw ApiError.create(409, '此組織名稱已被使用', ErrorCode.DATA_ALREADY_EXISTS);
  }

  const newOrganization = organizationRepository.create({
    userId, // 設置創建者的 userId
    orgName,
    orgAddress,
    orgMail,
    orgContact,
    orgMobile,
    orgPhone,
    orgWebsite
  });

  await organizationRepository.save(newOrganization);

  res.status(201).json({
    status: 'success',
    message: '組織創建成功',
    data: { organization: newOrganization as OrganizationData }
  });
});

// 更新組織 (需要是擁有者)
export const updateOrganization = handleErrorAsync(async (req: Request, res: Response<OrganizationResponse>) => {
  const authenticatedUser = req.user as { userId: string; };
  if (!authenticatedUser || !authenticatedUser.userId) {
    throw ApiError.unauthorized();
  }
  const userId = authenticatedUser.userId;
  const { organizationId } = req.params;
  const updateData = req.body as Partial<CreateOrganizationRequest>; // 使用 Partial 允許部分更新

  const organizationRepository = AppDataSource.getRepository(Organization);
  const organization = await organizationRepository.findOne({ where: { organizationId } });

  if (!organization) {
    throw ApiError.notFound('組織');
  }

  // 權限檢查：確保請求者是組織的擁有者
  if (organization.userId !== userId) {
    throw ApiError.forbidden();
  }

  // --- 基本驗證 (針對要更新的欄位) --- 
  const fieldErrors: Record<string, { code: string; message: string }> = {};
  if (updateData.orgName !== undefined) {
    if (updateData.orgName.trim() === '') {
      fieldErrors.orgName = { code: ErrorCode.VALIDATION_FAILED, message: '組織名稱不能為空' };
    } else if (updateData.orgName.length > 100) {
      fieldErrors.orgName = { code: ErrorCode.VALIDATION_FAILED, message: '組織名稱長度不能超過 100 個字' };
    }
  }
  if (updateData.orgAddress !== undefined) {
    if (updateData.orgAddress.trim() === '') {
      fieldErrors.orgAddress = { code: ErrorCode.VALIDATION_FAILED, message: '組織地址不能為空' };
    } else if (updateData.orgAddress.length > 100) {
      fieldErrors.orgAddress = { code: ErrorCode.VALIDATION_FAILED, message: '組織地址長度不能超過 100 個字' };
    }
  }
  if (updateData.orgMail !== undefined && updateData.orgMail.length > 100) {
    fieldErrors.orgMail = { code: ErrorCode.VALIDATION_FAILED, message: '組織信箱長度不能超過 100 個字' };
  }
  if (updateData.orgContact !== undefined && updateData.orgContact.length > 1000) {
    fieldErrors.orgContact = { code: ErrorCode.VALIDATION_FAILED, message: '組織聯絡方式長度不能超過 1000 個字' };
  }
  if (updateData.orgMobile !== undefined && updateData.orgMobile.length > 200) {
    fieldErrors.orgMobile = { code: ErrorCode.VALIDATION_FAILED, message: '組織手機長度不能超過 200 個字' };
  }
  if (updateData.orgPhone !== undefined && updateData.orgPhone.length > 200) {
    fieldErrors.orgPhone = { code: ErrorCode.VALIDATION_FAILED, message: '組織電話長度不能超過 200 個字' };
  }
  if (updateData.orgWebsite !== undefined && updateData.orgWebsite.length > 200) {
    fieldErrors.orgWebsite = { code: ErrorCode.VALIDATION_FAILED, message: '組織網站長度不能超過 200 個字' };
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw ApiError.validation('資料驗證失敗', fieldErrors);
  }
  // --- 驗證結束 --- 

  // 檢查名稱是否與其他組織重複 (排除自己)
  if (updateData.orgName !== undefined && updateData.orgName !== organization.orgName) {
    const existingOrg = await organizationRepository.findOne({ 
      where: { 
        orgName: updateData.orgName,
        organizationId: Not(organizationId) // 確保不是當前正在更新的組織
      }
    });
    if (existingOrg) {
      throw ApiError.create(409, '此組織名稱已被其他組織使用', ErrorCode.DATA_ALREADY_EXISTS);
    }
  }

  // 更新資料 (只更新請求中提供的欄位)
  Object.assign(organization, updateData);

  await organizationRepository.save(organization);

  res.status(200).json({
    status: 'success',
    message: '組織更新成功',
    data: { organization: organization as OrganizationData }
  });
  // res.status(501).json({ status:'failed', message: `Not Implemented: ${organizationId}` });
});

// 刪除組織 (需要是擁有者)
export const deleteOrganization = handleErrorAsync(async (req: Request, res: Response<ApiResponse<null>>) => {
  const authenticatedUser = req.user as { userId: string; };
  if (!authenticatedUser || !authenticatedUser.userId) {
    throw ApiError.unauthorized();
  }
  const userId = authenticatedUser.userId;
  const { organizationId } = req.params;

  const organizationRepository = AppDataSource.getRepository(Organization);
  const organization = await organizationRepository.findOne({ where: { organizationId } });

  if (!organization) {
    throw ApiError.notFound('組織');
  }

  // 權限檢查：確保請求者是組織的擁有者
  if (organization.userId !== userId) {
    throw ApiError.forbidden();
  }

  // 執行刪除 (軟刪除或硬刪除，取決於模型配置，目前看起來 Organization 模型沒有 DeleteDateColumn，所以是硬刪除)
  await organizationRepository.remove(organization);

  res.status(200).json({ 
    status: 'success', 
    message: '組織刪除成功',
    data: null // 刪除成功通常不返回 data
  });
  // res.status(501).json({ status:'failed', message: `Not Implemented: ${organizationId}` });
}); 