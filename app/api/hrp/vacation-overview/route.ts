import { type NextRequest, NextResponse } from 'next/server';
import getUserSession from '@/lib/auth/getUserSession';
import { getVacationAccountDetails } from '@/lib/hrp/vacation';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getUserSession();
  if (!session?.id || !session.roles?.includes('arbeitszeiterfassung')) {
    return NextResponse.json(
      { message: 'You are not authorized to perform this action.' },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get('date');
  const userIdParam = searchParams.get('userId');

  if (!dateParam) {
    return NextResponse.json(
      { message: 'Date parameter is required.' },
      { status: 400 },
    );
  }

  const targetDate = new Date(dateParam);
  if (isNaN(targetDate.getTime())) {
    return NextResponse.json(
      { message: 'Invalid date format.' },
      { status: 400 },
    );
  }

  let targetUserId = session.id;
  if (userIdParam && userIdParam !== session.id) {
    if (!session.roles?.includes('arbeitszeiterfassung-admin')) {
      return NextResponse.json(
        { message: 'You are not authorized to view other users vacation data.' },
        { status: 403 },
      );
    }
    targetUserId = userIdParam;
  }

  try {
    const vacationDetails = await getVacationAccountDetails(
      targetUserId,
      targetDate,
    );
    return NextResponse.json(vacationDetails);
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to get vacation account details:', error },
      { status: 500 },
    );
  }
}
