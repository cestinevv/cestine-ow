import type { ListReportTypesScope } from '@/api/__generated__/story/model/listReportTypesScope';
import type { SubmitUgcReportRequest } from '@/api/__generated__/story/model/submitUgcReportRequest';
import type { UgcReportTypeItemResponse } from '@/api/__generated__/story/model/ugcReportTypeItemResponse';
import { listReportTypes } from '@/api/__generated__/story/ugc-report/ugc-report';
import { appAxiosInstance } from '@/api/appRequest';
import { unwrapOrvalPayload } from '@/features/mining/miningFormat';
import { encodeSnowflakePathSegment } from '@/utils/snowflakeId';

export function getUgcReportTypesQueryKey(scope: ListReportTypesScope) {
  return ['/api/mini-drama/public/ugc/report-types', { scope }] as const;
}

export async function fetchUgcReportTypes(
  scope: ListReportTypesScope,
  options?: RequestInit,
): Promise<UgcReportTypeItemResponse[]> {
  const response = await listReportTypes({ scope }, options);

  return unwrapOrvalPayload<UgcReportTypeItemResponse[]>(response) ?? [];
}

export async function requestUgcReportWork({
  episodeId,
  data,
  options,
}: {
  episodeId: string;
  data: SubmitUgcReportRequest;
  options?: RequestInit;
}) {
  const episodeSegment = encodeSnowflakePathSegment(episodeId);

  return appAxiosInstance(
    `/api/mini-drama/user/ugc/works/${episodeSegment}/report`,
    {
      ...options,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      body: JSON.stringify(data),
    },
  );
}

export async function requestUgcReportDrama({
  dramaId,
  data,
  options,
}: {
  dramaId: string;
  data: SubmitUgcReportRequest;
  options?: RequestInit;
}) {
  const dramaSegment = encodeSnowflakePathSegment(dramaId);

  return appAxiosInstance(
    `/api/mini-drama/user/ugc/dramas/${dramaSegment}/report`,
    {
      ...options,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      body: JSON.stringify(data),
    },
  );
}

export async function requestUgcReportComment({
  commentId,
  data,
  options,
}: {
  commentId: string;
  data: SubmitUgcReportRequest;
  options?: RequestInit;
}) {
  const commentSegment = encodeSnowflakePathSegment(commentId);

  return appAxiosInstance(
    `/api/mini-drama/user/ugc/comments/${commentSegment}/report`,
    {
      ...options,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      body: JSON.stringify(data),
    },
  );
}

export async function requestUgcReportUser({
  targetUserId,
  data,
  options,
}: {
  targetUserId: string;
  data: SubmitUgcReportRequest;
  options?: RequestInit;
}) {
  const userSegment = encodeSnowflakePathSegment(targetUserId);

  return appAxiosInstance(
    `/api/mini-drama/user/ugc/users/${userSegment}/report`,
    {
      ...options,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      body: JSON.stringify(data),
    },
  );
}

export function mapUgcReportReasonOptions(
  reportTypeItems: UgcReportTypeItemResponse[] | undefined,
) {
  return (reportTypeItems ?? []).flatMap((item) => {
    const code = item.code?.trim();
    const name = item.name?.trim();

    if (!code || !name) {
      return [];
    }

    return [{ code, name }];
  });
}
