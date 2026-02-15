
-- Allow team admins to manage mobile shop branches
CREATE POLICY "Team admins can manage workspace shop branches"
ON public.mobile_shop_branches
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM mobile_shops s
    WHERE s.id = mobile_shop_branches.shop_id
    AND get_team_role(auth.uid(), s.user_id) IN ('admin', 'manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM mobile_shops s
    WHERE s.id = mobile_shop_branches.shop_id
    AND get_team_role(auth.uid(), s.user_id) IN ('admin', 'manager')
  )
);

-- Allow team admins to manage room types
CREATE POLICY "Team admins can manage workspace room types"
ON public.room_types
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM hotels h
    WHERE h.id = room_types.hotel_id
    AND get_team_role(auth.uid(), h.user_id) IN ('admin', 'manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM hotels h
    WHERE h.id = room_types.hotel_id
    AND get_team_role(auth.uid(), h.user_id) IN ('admin', 'manager')
  )
);

-- Allow team admins to manage room photos
CREATE POLICY "Team admins can manage workspace room photos"
ON public.room_photos
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM room_types rt
    JOIN hotels h ON h.id = rt.hotel_id
    WHERE rt.id = room_photos.room_type_id
    AND get_team_role(auth.uid(), h.user_id) IN ('admin', 'manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM room_types rt
    JOIN hotels h ON h.id = rt.hotel_id
    WHERE rt.id = room_photos.room_type_id
    AND get_team_role(auth.uid(), h.user_id) IN ('admin', 'manager')
  )
);

-- Allow team admins to manage hotel bookings
CREATE POLICY "Team admins can manage workspace hotel bookings"
ON public.hotel_bookings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM hotels h
    WHERE h.id = hotel_bookings.hotel_id
    AND get_team_role(auth.uid(), h.user_id) IN ('admin', 'manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM hotels h
    WHERE h.id = hotel_bookings.hotel_id
    AND get_team_role(auth.uid(), h.user_id) IN ('admin', 'manager')
  )
);

-- Allow team admins to manage hotel offers
CREATE POLICY "Team admins can manage workspace hotel offers"
ON public.hotel_offers
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM hotels h
    WHERE h.id = hotel_offers.hotel_id
    AND get_team_role(auth.uid(), h.user_id) IN ('admin', 'manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM hotels h
    WHERE h.id = hotel_offers.hotel_id
    AND get_team_role(auth.uid(), h.user_id) IN ('admin', 'manager')
  )
);

-- Allow team admins to view workspace user settings (needed for WhatsApp selection)
CREATE POLICY "Team members can view workspace settings"
ON public.user_settings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.user_id = auth.uid()
    AND tm.workspace_owner_id = user_settings.id
  )
);
